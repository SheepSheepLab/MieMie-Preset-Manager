# Preset Entry Migration · Initial Implementation Candidate

Local post-0.2.3 Candidate. Owner review only; no commit, push, tag, release, Issue/PR edit or version change.

## Baseline and identity

HEAD / origin/main: `06b3ffbe16bb96348d2a477223f1242494408ada` (main).
Package/product version: 0.2.3. Product ID, script ID, repository and author SheepSheep unchanged. BRAND, README, PNG icon, louisSSR commit attribution, PR #2, contribution copyright and license provenance unchanged.

## Implemented behavior

- Source: non-current saved preset, disk read only, detached complete object, fingerprint plus full-object freshness comparison. No native select/apply/save, receipt, binding or current snapshot changes. Source request races use latest request only.
- Target: pinned current preset, using existing Pending Raw. Previous pending edits remain. Unconfirmed main Prompt/parameter editors block entry.
- Same title: exact raw equality; no trim, case-folding or Unicode normalization. Missing/blank source title rejected. Multiple definitions demand explicit target choice, including unattached definitions. Protected content cannot fall back to insertion.
- Comparison: both textareas editable. Left is local temporary text only. Right is controller-owned Draft, participating in Dirty and Generation Gate. Bridge copies only content; confirmation stages only changed content. Missing content stays absent on a no-op.
- Insertion: ordinary copyable custom prompt only, fresh UUID, full allowed definition and original title, one reference in active group 100001. Source active reference enabled state preserved; unattached source defaults enabled=true. Other groups and existing references unchanged.
- Positions: literal group top/bottom or after the last active reference in selected existing category, including disabled/fragmented categories. No anchor means visible disabled category. All/Unclassified omitted. No title or category-model rewrite.
- Accumulation: repeated confirmations build on current Pending Raw. Close retains confirmed Pending. Cancel discards only current unconfirmed migration comparison; external-conflict draft retained for recovery.
- Save: only existing main Save Changes → Controller/Adapter/checkLive/revision/full validation/native readback. No second persistence path.
- Unknown data: unchanged target parameters/prompts/groups/extensions/unknown fields preserved. Insertion refuses any unknown reference metadata; unknown Prompt fields with text or reference-like keys also refused. Inert non-reference numeric/boolean/null containers can be copied intact. Refusal never strips a field.

## UI and lifecycle

Independent MPM-owned HTML modal: desktop max1080px, main window remains600px. Layout uses actual available width (<760px stacked), 390px supported. Independent lists/textareas scroll; public seam Bridge uses40px visual/48px hit target, horizontal desktop arrow/vertical mobile arrow. Custom source picker, fixed reachable footer, Escape/focus return, viewport keyboard-height/rotation adaptation, reduced motion. Textarea identity/focus/selection remain stable during notifications. No full-preset clone/read or full-dialog rebuild per keystroke.

Standalone/native floating/Hub/Shortcut share one Adapter, Controller, Binding and extension session. Formal Surface hide/inert/dispose/reattach removes modal/backdrop/listeners. No second attachPanel, no Hub core changes, no generated logo/character/mascot copied.

## Safety clarification

New real native-method fixture tests exposed an existing ready-state Generation Gate gap: local Dirty could arise without a chat/native event, and the async generation read could finish after Dirty began. The coordinator now invalidates the permit on Dirty and checks Dirty/Busy both before and after the async read. This strengthens protection; Binding schema and checkLive are unchanged.

## This-run validation (2026-10-09)

| Check | Result |
| --- | --- |
| TypeScript check | PASS |
| Core/model/controller/adapter/native contracts/binding/migration tests | 362 PASS, 0 FAIL |
| Build | PASS; included 362 core tests and 15 package-build tests |
| Main browser / responsive | 19 + 9 PASS |
| Binding browser | 35 PASS |
| Presentation / Hub / Shortcut / native floating | 57 PASS |
| Parameters browser / motion | 44 + 28 PASS |
| UI performance | 24 PASS |
| Save comparator benchmark | Completed; 8 correctness assertions, 500 prompts / 4,531,313 JSON bytes; CPU comparison only, no end-to-end latency claim |
| Package v1 command | 71 PASS, 0 FAIL |
| Migration browser | 24 PASS; desktop/mobile, focus/selection, resize, Hub/Shortcut lifecycle; no page errors |
| Actual ST 1.19 + Helper 4.11.3 + Chromium | 7 PASS; actual Helper script iframe, source read/content merge/insertion Pending, Unified Save/readback/reload including full-object expected-delta equality, source unchanged, native unsaved parameter protection, explicit native reselect/reread recovery; no page errors |
| Safari | BLOCKED by application-level accessibility approval review: cannot constrain read to test window; may include unrelated private tabs. Awaiting specific authorization or Owner manual review |
| Physical iOS keyboard / Mobile Safari / live ST 1.18 | NOT TESTED this Candidate; 390px/keyboard-height/rotation automated simulation only; ST1.18 compatibility via pinned native contracts |

Full logs are copied into the output logs directory. Browser evidence: evidence/migration/results.json and migration-1280.png / migration-390.png. Real-host receipt: output real-host/chromium-results.json.

## Isolated actual host

ST1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`, existing Helper4.11.3 public source, separate config/dataRoot at output real-host, loopback8879. No Owner config, preset, chat, secret or binding copied. Owner8000/8001 and ST1.18 untouched; extension/model auto-download disabled in test config. Candidate installed through Helper public script tree API. Only public Default-derived synthetic presets used. Native canonical export was used during fixture preparation to align legitimately applied context/unlock defaults; production checkLive was never bypassed. Temporary native unsaved temperature was restored through native reselect and manager reread. Core source unchanged. Test server is stopped after testing.

## Candidate

File: `MieMie-Preset-Manager-Migration-Candidate-0.2.3.json`

SHA-256: `52a811df49232525468db7898c486d20b575b0393aa1767f3b9ea9e54193dbd7`

Use an isolated test profile. Keep a backup of official0.2.3 script/presets; import this JSON through Helper and keep only one enabled MPM instance. Existing main menu → 预设条目迁移. Select source/prompt → Bridge → compare/overwrite/edit/cancel/confirm; try a new title with top/bottom/category placement; repeat then return and Save Changes; refresh and verify persistence/source unchanged. Test mobile stacked view separately. Restore official0.2.3 after review if not retaining Candidate. This is not a release asset or Hub update.

## Known boundaries

No batch migration, source writeback, category rewrite, third-party identifier graph rewriting or expanded host-version support. Conservative unknown-reference/opaque-text insertion refusals are intentional and reported per entry. Actual Safari, iOS software keyboard/rotation and real Hub-host migration remain Owner acceptance items unless separately verified. Pinned Hub runtime fragments have synthetic Launcher/storage dependencies; they are not a live Hub installation claim.

## Files

Modified: contracts.ts, st-adapter.ts, controller.ts, chat-preset-coordinator.ts, preview.ts, icons.ts, ui.ts, package.json, tests/st-adapter.test.ts, tests/chat-binding-native.test.cjs, tests/mobile-responsive.cjs.

Added: migration-model.ts, migration-controller.ts, migration-ui.ts, migration-styles.ts, tests/migration.test.cjs, tests/migration-browser.cjs, tests/migration-realhost-local.cjs, docs/MIGRATION-CANDIDATE.md.

Tracked release delivery JSON/update/checksums are restored to baseline after the local Candidate copy; they are not changed for release. Existing PNG/brand/header/footer/main animations preserved. No commit/push/tag/release/Issue/PR/version/identity/history changes. Stop for Owner acceptance.


> 隐私历史迁移说明：文中涉及的提交标识已对应至迁移后历史；历史测试时间、结论及贡献归属保持原意，不表示重新执行了当时的验收。原始记录由维护者受保护保存。
