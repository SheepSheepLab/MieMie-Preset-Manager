# Test data provenance

These fixtures contain public SillyTavern material from immutable upstream commits. The upstream portions retain **AGPL-3.0**; the complete license is preserved in [SillyTavern-LICENSE.txt](SillyTavern-LICENSE.txt). They are not relicensed under the project's GPL license.

## Default presets

`st-1.18.0-default.json` is the unchanged public Default preset from official tag 1.18.0:

- Commit `51ad27fb86d39a3daca3adaa970375c9670c12df`.
- [Original file](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/default/content/presets/openai/Default.json).
- [Upstream license](https://github.com/SillyTavern/SillyTavern/blob/51ad27fb86d39a3daca3adaa970375c9670c12df/LICENSE).

`st-1.19.0-default.json` is the unchanged public Default preset originally inspected at commit `06bde939fb1e9c4c8d8641d810f0a916b5bce127`. Its bytes were also checked against official tag 1.19.0, commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`, and are identical:

- [Original inspected file](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/default/content/presets/openai/Default.json).
- [Official 1.19.0 file](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/default/content/presets/openai/Default.json).
- [Upstream license](https://github.com/SillyTavern/SillyTavern/blob/7e8663cd9c184a550b37238218bdd32c6efc68e9/LICENSE).

These are official public presets, not private user data. Prompt bodies named `nsfw` and `jailbreak` are empty in both files. Tests add future fields only to cloned or in-memory objects to check field preservation; the stored upstream Default files remain unchanged.

## Native API excerpts

`st-native-contracts.json` contains 46 unchanged JavaScript excerpts from the two official tags and the earlier inspected 1.19 commit listed above. Each excerpt records its immutable commit, source path, original one-based line interval, and SHA-256 of the complete source file. Missing 1.18 promise APIs are recorded as `null`, not invented implementations.

The [source provenance record](../../docs/source-provenance.json) records inspected files and hashes. The native contract harness executes the original method bodies with mocked DOM, event, and persistence dependencies. This supplies version-pinned source and contract evidence; it is not execution of a real SillyTavern server or Tavern Helper iframe, and it does not establish compatibility with every release in either version family.

These fixtures are used only by the local tests and are excluded from the production bundle and Extension JSON. Other test fixtures are synthetic data authored for this project. See [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) for the repository's third-party inventory.

## MieMie Hub API v1 contracts

`hub-v1-contracts.json` contains 9 unchanged excerpts from SheepSheepLab/MieMie-Hub commit `928362c1eb224afe780801060c6d867e01cf5013`: Runtime, bootstrap provide/registerSource, Hub UI renderMenu/attachPanel/showPanel/closePanel, Surface controller and motion. Every excerpt records its original file/line interval and full source SHA-256. Upstream copyright and GPL v3 terms are retained; the complete upstream license is in [MieMie-Hub-LICENSE.txt](MieMie-Hub-LICENSE.txt).

The harness executes these function bodies using the unchanged production Manifest, synthetic DOM/storage/Launcher dependencies and no visual animation. It checks validation, activation, presentation-image selection/failure fallback, formal close/reopen and invalid oversized launcher metadata. It does not normalize the Manifest or start a real Hub. The excerpts and test helper are excluded from production bundles.

`hub-v1-shortcut-launchers.js` is the complete, byte-identical public `src/shortcut-launchers.js` at the same Hub commit `928362c1eb224afe780801060c6d867e01cf5013`; Git blob `93436eefe54d4d89be94f40109f3f9dba072d43e`. Its upstream GNU GPL v3 terms and attribution are retained under the license above. `tests/presentation-browser.cjs` executes this real preference/mount/origin registry with the original Runtime and Surface excerpts, the production Manifest and real DOM/WAAPI, while Launcher/storage/host dependencies and all presets are synthetic. This is stronger contract/visual evidence, not real Hub installation or real ST acceptance. These test sources never enter the production bundle.


## Hub Package v1 test fixture

`tests/fixtures/hub-package-v1/` retains byte-exact Package source modules and `tests/package-manager.test.mjs` from [MieMie Hub](https://github.com/SheepSheepLab/MieMie-Hub/tree/928362c1eb224afe780801060c6d867e01cf5013), commit `928362c1eb224afe780801060c6d867e01cf5013`. Upstream contributors retain attribution, GPL-3.0-or-later; the unmodified GPL text is included in the fixture LICENSE. Paths and SHA-256 are recorded in provenance.json. Test-only imports; no Hub Package implementation or upstream test data enters the production Extension. Synthetic script trees and development HTTP responses are not real-host evidence.


## Per-Chat binding contracts

`st-binding-contracts.json` preserves 22 unchanged function/method excerpts at the official 1.18.0 (`51ad27fb86d39a3daca3adaa970375c9670c12df`) and 1.19.0 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`) commits. Each entry records source path, first line and full source SHA-256. Public upstream AGPL-3.0 attribution/license above still apply; none is imported into production.

The harness executes the native EventEmitter, saveMetadata/saveChatConditional, autoSelectPreset, getAllPresets, stopGeneration, request functions and unchanged Generate prefix through GENERATION_AFTER_COMMANDS. Full Generate and generateGroupWrapper are retained for control-flow/signal review. Prompt assembly, backend transport, group member iteration and streaming payload are synthetic dependencies; the full Generate tail and real server are not executed. Source provenance includes context, event, endpoint and complete source hashes. This is not real-host validation of ST, Tavern Helper, Hub, physical phones or every patch release.

## Preset regex notifications and message display

`st-regex-contracts.json` contains unchanged `notifyReloadCurrentChat`, `checkPresetEmbeddedRegexScripts`, and `updateMessageBlock` functions from the same pinned official 1.18.0 and 1.19.0 commits listed above. Full source hashes, URLs, and one-based line ranges are recorded in the fixture. Tests execute these functions with mocked dependencies; they do not represent real-host acceptance. The source retains AGPL-3.0 and never enters the production bundle.

## Prompt policy closeout contracts

`st-prompt-policy-contracts.json` contains exact PromptManager.js method bodies re-extracted from official ST 1.18.0 `51ad27fb86d39a3daca3adaa970375c9670c12df` and 1.19.0 `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Full source SHA-256, snippet SHA-256 and line ranges are recorded. Both full files hash to `b0054793b763d92b265f5f487645b68b4eca0867cb5ad6b5deb1034004b2c1cc`. These are upstream AGPL-3.0 excerpts; see SillyTavern-LICENSE.txt. Eligibility, detach and collection methods execute with synthetic dependencies; this is not a full ST Generate or real-host test.
