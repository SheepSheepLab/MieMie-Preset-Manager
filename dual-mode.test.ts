// Copyright (C) 2026 louisSSR
// SPDX-License-Identifier: GPL-3.0-or-later
// See LICENSE for terms; distributed without warranty.

import { test } from 'node:test';
import { getEventListeners } from 'node:events';
import type { ManagerView } from './contracts';
import { PRESET_MANAGER_MANIFEST, startDualMode } from './dual-mode';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class TestElement extends EventTarget {
  children: TestElement[] = [];
  parentNode: TestElement | null = null;
  dataset: Record<string, string> = {};
  style = Object.assign({} as Record<string, any>, { setProperty(key: string, value: string) { this[key] = value; }, removeProperty(key: string) { delete this[key]; } });
  private hiddenValue = true;
  readonly hiddenObservers = new Set<() => void>();
  get hidden() {
    return this.hiddenValue;
  }
  set hidden(value: boolean) {
    if (this.hiddenValue === value) return;
    this.hiddenValue = value;
    this.hiddenObservers.forEach(notify => notify());
  }
  inert = true;
  textContent = '';
  constructor(
    readonly ownerDocument: TestDocument,
    readonly tag: string,
  ) {
    super();
    if (tag === 'button') { this.hidden = false; this.inert = false; }
  }
  get isConnected(): boolean {
    return this.tag === 'html' || Boolean(this.parentNode?.isConnected);
  }
  appendChild(child: TestElement) {
    child.remove();
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  append(...children: TestElement[]) { children.forEach(child => this.appendChild(child)); }
  focus() {}
  querySelector() { return null; }
  getBoundingClientRect() {
    const left = parseFloat(this.style.left) || 0, top = parseFloat(this.style.top) || 0;
    const width = parseFloat(this.style.width) || 600, height = parseFloat(this.style.height) || 780;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this);
    this.parentNode = null;
  }
  setAttribute(_name: string, _value: string) {}
}
class TestDocument {
  documentElement = new TestElement(this, 'html');
  createElement(tag: string) {
    return new TestElement(this, tag);
  }
}
class TestMutationObserver {
  private target: TestElement | null = null;
  constructor(private readonly callback: () => void) {}
  private readonly notify = () => {
    queueMicrotask(() => {
      if (this.target) this.callback();
    });
  };
  observe(target: TestElement) {
    this.target = target;
    target.hiddenObservers.add(this.notify);
  }
  disconnect() {
    this.target?.hiddenObservers.delete(this.notify);
    this.target = null;
  }
}
async function flushNative() { for (let i = 0; i < 16; i++) await Promise.resolve(); }
type TestInstance = { activate(): Promise<void>; open(): unknown; deactivate(): void };

function environment() {
  const doc = new TestDocument();
  const parent = doc.documentElement;
  const panel = doc.createElement('section');
  parent.appendChild(panel);
  let opened = 0,
    closed = 0,
    destroyed = 0;
  let closeHandler: (() => unknown) | null = null;
  const view: ManagerView = {
    setCloseHandler(handler: (() => unknown) | null) { closeHandler = handler; },
    panel: panel as unknown as HTMLElement,
    open() {
      opened++;
      panel.hidden = false;
      panel.inert = false;
    },
    close() {
      closed++;
      panel.hidden = true;
      panel.inert = true;
    },
    dispose() {
      destroyed++;
      panel.remove();
    },
  };
  const host = Object.assign(new EventTarget(), {
    document: doc,
    innerWidth: 1000,
    innerHeight: 800,
    visualViewport: undefined,
    MutationObserver: TestMutationObserver,
    getComputedStyle: () => ({ getPropertyValue: () => '0px' }),
    // Fast deterministic coverage of bounded waits, with no real Hub or browser.
    setTimeout: (fn: () => void, ms: number) => globalThis.setTimeout(fn, Math.min(ms, 5)),
    clearTimeout: (id: number) => globalThis.clearTimeout(id),
    __MieMieHub: undefined as unknown,
  }) as unknown as Window & Record<string, any>;
  const frame = new EventTarget() as unknown as Window;
  const emit = (name: string, detail?: unknown) => {
    const event = new Event(name);
    Object.defineProperty(event, 'detail', { value: detail });
    host.dispatchEvent(event);
  };
  const launchers = () => parent.children.filter(node => 'miemiePresetManagerStandalone' in node.dataset);
  return { host, frame, view, panel, emit, launchers, requestClose: () => closeHandler ? closeHandler() : view.close(), counts: () => ({ opened, closed, destroyed }) };
}

function hubMock(
  options: { reject?: boolean; neverReady?: boolean; neverRelease?: boolean; missingClose?: boolean; attachmentParent?: TestElement } = {},
) {
  const instances: TestInstance[] = [];
  const panels: HTMLElement[] = [];
  let releases = 0, closeCalls = 0, state = 'closed', launcherSuspended = false;
  const controllers: AbortController[] = [];
  const cleanups: (() => void)[] = [];
  const hub = {
    apiVersion: 1,
    extensions: {
      provide(manifest: typeof PRESET_MANAGER_MANIFEST, factory: (api: any) => TestInstance) {
        assert(manifest.id === 'miemie.preset-manager', 'Wrong Hub registration identity');
        if (options.reject) return { ok: false, error: 'registration fixture refused' };
        const controller = new AbortController();
        controllers.push(controller);
        const instance = factory({
          signal: controller.signal,
          onCleanup(fn: () => void) {
            cleanups.push(fn);
          },
          attachPanel(panel: HTMLElement) {
            options.attachmentParent?.appendChild(panel as unknown as TestElement);
            panels.push(panel);
            panel.hidden = true;
            return true;
          },
          showPanel() {
            state = 'preset'; launcherSuspended = true;
            panels.at(-1)!.hidden = false; panels.at(-1)!.inert = false;
            return true;
          },
          closePanel: options.missingClose ? undefined : () => {
            closeCalls++; state = 'closed'; launcherSuspended = false;
            panels.at(-1)!.hidden = true; panels.at(-1)!.inert = true;
            return Promise.resolve(true);
          },
        });
        instances.push(instance);
        const activation = instance.activate();
        return {
          ok: true,
          ready: options.neverReady ? new Promise(() => {}) : activation,
          release() {
            releases++;
            if (options.neverRelease) return new Promise(() => {});
            controller.abort();
            instance.deactivate();
            cleanups
              .splice(0)
              .reverse()
              .forEach(fn => fn());
            return Promise.resolve();
          },
        };
      },
    },
  };
  return { hub, instances, panels, controllers, cleanups, releases: () => releases, surface: () => ({ state, launcherSuspended, closeCalls }) };
}

/** Run against the compiled module; these are offline protocol checks only. */
export async function runDualModeTests() {
  const checks: string[] = [];
  {
    const e = environment();
    const source = startDualMode(e.host, e.frame, e.view);
    await source.settled();
    assert(e.launchers().length === 1, 'Standalone must have one launcher');
    assert(
      !e.launchers()[0].hidden && e.panel.hiddenObservers.size === 0,
      'Closed panel must keep one visible native launcher without a visibility observer',
    );
    assert(e.launchers()[0].style.width === '64px' && e.launchers()[0].style.top === '439.59999999999997px', 'Native launcher uses 64px and its own default Dock ratio');
    e.launchers()[0].dispatchEvent(new Event('click'));
    await flushNative();
    assert(e.counts().opened === 1, 'Standalone click must open shared view');
    assert(
      !e.launchers()[0].hidden && !e.launchers()[0].inert,
      'Native orb remains visible while the shared application window is open',
    );
    e.view.close();
    await flushNative();
    assert(!e.launchers()[0].hidden, 'Closing through the UI must restore the launcher');
    e.view.open();
    await flushNative();
    assert(!e.launchers()[0].hidden, 'Opening from another entry retains the native orb');
    let rejected = false;
    try {
      startDualMode(e.host, e.frame, e.view);
    } catch {
      rejected = true;
    }
    assert(rejected, 'A second active source must be rejected');
    await source.dispose();
    assert(e.launchers().length === 0 && e.counts().destroyed === 0, 'Adapter must remove only its launcher');
    assert(!e.host.__MieMiePresetManagerSource, 'Disposed source marker must be removed');
    assert(e.panel.hiddenObservers.size === 0, 'Disposal must disconnect the launcher visibility observer');
    e.emit('miemie:hub-ready');
    await source.settled();
    assert(e.launchers().length === 0, 'Disposed source must not reactivate');
    checks.push('standalone / duplicate source / final cleanup');
  }
  {
    const e = environment();
    const source = startDualMode(e.host, e.frame, e.view);
    await source.settled();
    const first = hubMock();
    e.host.__MieMieHub = first.hub;
    e.emit('miemie:hub-ready');
    await source.settled();
    assert(e.launchers().length === 0 && first.panels[0] === e.view.panel, 'Hub must take the existing panel');
    first.instances[0].open();
    const second = hubMock();
    e.host.__MieMieHub = second.hub;
    e.emit('miemie:hub-ready');
    await source.settled();
    assert(first.releases() === 1 && second.panels[0] === e.view.panel, 'Hub replacement must retain panel identity');
    second.instances[0].open();
    const before = e.counts();
    first.instances[0].open();
    first.instances[0].deactivate();
    e.emit('miemie:hub-disposed', first.hub);
    await source.settled();
    assert(
      e.counts().opened === before.opened && e.counts().closed === before.closed,
      'Old Hub callbacks must not control current view',
    );
    e.host.__MieMieHub = undefined;
    e.emit('miemie:hub-disposed', second.hub);
    await source.settled();
    assert(e.launchers().length === 1 && e.panel.isConnected, 'Hub disappearance must recover standalone');
    assert(
      e.counts().destroyed === 0 && first.panels[0] === second.panels[0],
      'Hub transitions must not destroy or recreate business view',
    );
    await source.dispose();
    checks.push('shared panel / Hub replacement / stale callbacks / standalone recovery');
  }
  for (const options of [{ reject: true }, { neverReady: true, neverRelease: true }]) {
    const e = environment();
    const hub = hubMock(options);
    e.host.__MieMieHub = hub.hub;
    const source = startDualMode(e.host, e.frame, e.view);
    await source.settled();
    assert(e.launchers().length === 1, 'Broken Hub must fall back within bounded waits');
    const before = e.counts();
    hub.instances[0]?.open();
    assert(e.counts().opened === before.opened, 'Failed Hub must lose its view capability');
    await source.dispose();
  }
  checks.push('registration rejection / never-ready / never-release fallback');
  {
    const e = environment();
    const originalParent = e.panel.parentNode!;
    const hiddenHubContainer = e.panel.ownerDocument.createElement('aside');
    originalParent.appendChild(hiddenHubContainer);
    const hub = hubMock({ attachmentParent: hiddenHubContainer });
    e.host.__MieMieHub = hub.hub;
    const source = startDualMode(e.host, e.frame, e.view);
    await source.settled();
    assert(e.panel.parentNode === hiddenHubContainer, 'Active Hub must keep ownership of its panel container');
    hub.instances[0].open();
    assert(e.panel.parentNode === hiddenHubContainer, 'Opening inside active Hub must not move the panel away');
    e.host.__MieMieHub = undefined;
    e.emit('miemie:hub-disposed', hub.hub);
    await source.settled();
    assert(
      hiddenHubContainer.isConnected && hiddenHubContainer.hidden,
      'Fixture must keep the old hidden Hub container connected',
    );
    assert(
      e.panel.parentNode === originalParent,
      'Standalone recovery must leave the still-connected hidden Hub container',
    );
    e.launchers()[0].dispatchEvent(new Event('click'));
    await flushNative();
    assert(
      !e.panel.hidden && e.panel.parentNode === originalParent,
      'Recovered standalone panel must open in its original parent',
    );
    await source.dispose();
    checks.push('connected hidden Hub container / standalone panel restoration');
  }
  {
    const e = environment();
    const hub = hubMock({ neverRelease: true });
    e.host.__MieMieHub = hub.hub;
    const source = startDualMode(e.host, e.frame, e.view);
    await source.settled();
    await source.dispose();
    assert(
      !e.host.__MieMiePresetManagerSource && e.counts().destroyed === 0,
      'Disposal must settle despite hanging Hub',
    );
    hub.controllers[0].abort();
    hub.cleanups.forEach(fn => fn());
    checks.push('bounded shutdown / delayed Hub cleanup');
  }
  return checks;
}

test('shared preset-manager view survives launcher and Hub lifecycle changes', runDualModeTests);


test('B2 UI close routes through the active Hub Surface and returns to standalone on disposal', async () => {
  const e = environment(), source = startDualMode(e.host, e.frame, e.view);
  await source.settled();
  e.view.open(); await e.requestClose();
  assert(e.panel.hidden, 'Standalone close must hide the panel');
  e.launchers()[0].dispatchEvent(new Event('click'));
  await flushNative();
  assert(!e.panel.hidden, 'Standalone reopen must work');
  const first = hubMock(); e.host.__MieMieHub = first.hub; e.emit('miemie:hub-ready');
  await source.settled();
  for (let i = 1; i <= 5; i++) {
    first.instances[0].open(); await e.requestClose();
    const surface = first.surface();
    assert(surface.state === 'closed' && !surface.launcherSuspended && surface.closeCalls === i,
      'Hub must close its Surface and restore its launcher once per UI request');
    assert(e.panel.hidden && first.panels.length === 1 && first.instances.length === 1, 'One panel/session must be reused');
    assert(first.cleanups.length === 1 && getEventListeners(first.controllers[0].signal, 'abort').length === 1, 'Close/open must not add session cleanup or abort listeners');
    assert(getEventListeners(e.host as unknown as EventTarget, 'miemie:hub-ready').length === 1
      && getEventListeners(e.host as unknown as EventTarget, 'miemie:hub-disposed').length === 1, 'One host listener per lifecycle event');
  }
  e.host.__MieMieHub = undefined; e.emit('miemie:hub-disposed', first.hub); await source.settled();
  e.launchers()[0].dispatchEvent(new Event('click')); await flushNative(); await e.requestClose();
  assert(e.panel.hidden && e.launchers().length === 1 && e.panel.hiddenObservers.size === 0, 'Standalone recovers one native launcher');
  const second = hubMock(); e.host.__MieMieHub = second.hub; e.emit('miemie:hub-ready'); await source.settled();
  second.instances[0].open(); await e.requestClose();
  assert(second.surface().closeCalls === 1 && first.surface().closeCalls === 5, 'Rejoin uses only the new Hub capability');
  assert(second.panels[0] === first.panels[0] && e.counts().destroyed === 0, 'No second business view');
  await source.dispose();
  assert(e.panel.hiddenObservers.size === 0 && first.cleanups.length === 0 && second.cleanups.length === 0, 'Final cleanup removes observers/session cleanup');
  assert(getEventListeners(e.host as unknown as EventTarget, 'miemie:hub-ready').length === 0
    && getEventListeners(e.host as unknown as EventTarget, 'miemie:hub-disposed').length === 0, 'Final cleanup removes host listeners');
});


test('B2 Hub without a formal close capability safely falls back to Standalone', async () => {
  const e = environment(), hub = hubMock({ missingClose: true });
  e.host.__MieMieHub = hub.hub;
  const source = startDualMode(e.host, e.frame, e.view);
  await source.settled();
  assert(e.launchers().length === 1 && hub.panels.length === 0, 'Do not capture a panel that cannot formally close');
  e.launchers()[0].dispatchEvent(new Event('click')); await flushNative(); await e.requestClose();
  assert(e.panel.hidden, 'Recovered Standalone close must work');
  await source.dispose();
});

// Native geometry expectations deliberately replace the old 60px/hidden-orb
// presentation. Business lifecycle assertions above remain unchanged.
test('native Dock threshold and persistence are isolated from other products', async () => {
  const e = environment(), storage = new Map<string,string>();
  e.host.localStorage = {getItem:(key:string)=>storage.get(key) ?? null,setItem:(key:string,value:string)=>storage.set(key,value)};
  const source = startDualMode(e.host,e.frame,e.view); await source.settled();
  const orb = e.launchers()[0];
  const pointer = (name:string,x:number,y:number) => {
    const event = new Event(name); Object.assign(event,{pointerId:7,isPrimary:true,button:0,clientX:x,clientY:y}); orb.dispatchEvent(event);
  };
  pointer('pointerdown',926,450); pointer('pointermove',930,454);
  assert(orb.style.transform === 'none','Movement below 7px cannot start dragging');
  pointer('pointermove',30,200); pointer('pointerup',30,200);
  const click = new Event('click'); Object.assign(click,{detail:1}); orb.dispatchEvent(click); await flushNative();
  assert(e.panel.hidden && e.counts().opened === 0,'Drag completion cannot also open');
  assert(orb.style.left === '10px','Drag docks left');
  const key = 'miemie_preset_manager_dock_v1';
  assert(JSON.parse(storage.get(key)!).side === 'left' && storage.size === 1,'Only product side/ratio persists');
  await source.dispose();
  const again = startDualMode(e.host,e.frame,e.view); await again.settled();
  assert(e.launchers()[0].style.left === '10px','Recreated presentation restores its Dock'); await again.dispose();
});
test('native viewport/disposal cleans listeners without destroying the business view', async () => {
  const e = environment(), source = startDualMode(e.host,e.frame,e.view); await source.settled();
  assert(getEventListeners(e.host,'orientationchange').length === 1 && getEventListeners(e.host,'resize').length === 1,'One native viewport listener');
  e.host.innerWidth = 320; e.host.innerHeight = 420; e.emit('resize');
  const keyboardClick = new Event('click'); Object.assign(keyboardClick,{detail:0});
  e.launchers()[0].dispatchEvent(keyboardClick); await flushNative();
  assert(e.panel.style.width === '300px' && e.panel.style.height === '400px','Actual application window clamps with margins');
  assert(e.counts().opened === 1 && e.counts().destroyed === 0,'Same view opens after rotation');
  await source.dispose(); e.emit('resize'); e.emit('orientationchange');
  assert(getEventListeners(e.host,'orientationchange').length === 0 && getEventListeners(e.host,'resize').length === 0,'Native listeners removed');
  assert(e.launchers().length === 0 && e.counts().destroyed === 0,'Presentation disposal never disposes business');
});
test('native queued opening cannot revive after source disposal', async () => {
  const e = environment(), source = startDualMode(e.host,e.frame,e.view); await source.settled();
  e.launchers()[0].dispatchEvent(new Event('click')); await source.dispose(); await flushNative();
  assert(e.panel.hidden && e.counts().opened === 0 && e.counts().destroyed === 0,'Disposed pending open cannot reopen or recreate the view');
});
