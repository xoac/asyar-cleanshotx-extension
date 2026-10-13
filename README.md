# CleanShot X for Asyar

Control [CleanShot X](https://cleanshot.com/) from the [Asyar](https://github.com/Xoshbin/asyar) launcher. Each command
hides the launcher and then triggers CleanShot X through its `cleanshot://` URL scheme. macOS only.

Ported from the [Raycast `cleanshotx` extension](https://github.com/raycast/extensions/tree/main/extensions/cleanshotx)
(MIT, by Aayush9029). Only the URL-scheme commands are ported; see "Not ported" below.

## Commands

| Command | CleanShot X URL | `action` argument |
| --- | --- | --- |
| Capture Area | `cleanshot://capture-area` | yes |
| Capture Fullscreen | `cleanshot://capture-fullscreen` | yes |
| Capture Window | `cleanshot://capture-window` | yes |
| Capture Previous Area | `cleanshot://capture-previous-area` | yes |
| Self Timer | `cleanshot://self-timer` | yes |
| Record Screen | `cleanshot://record-screen` | no |
| Open History | `cleanshot://open-history` | no |
| Scrolling Capture | `cleanshot://scrolling-capture` | no |
| All in One | `cleanshot://all-in-one` | no |
| Capture Text (OCR) | `cleanshot://capture-text` | no |
| Open from Clipboard | `cleanshot://open-from-clipboard` | no |
| Toggle / Hide / Show Desktop Icons | `cleanshot://toggle-desktop-icons`, `hide-...`, `show-...` | no |
| Restore Recently Closed | `cleanshot://restore-recently-closed` | no |

The optional `action` argument (`copy`, `save`, `annotate`, `upload`, `pin`) is appended as `?action=<value>`. Leave it
empty to use CleanShot X's default behavior. It is declared with `seed: "none"`, so Asyar does not pre-fill the last
value. Every command can also be started via a deep link, e.g. `asyar://extensions/io.github.xoac.cleanshotx/capture-area?action=copy`.
Deep links deliver query params flat (`args.action` plus `deeplinkTrigger: true`) instead of under `args.arguments`;
the worker accepts both shapes (`extractArguments` in `src/extension.ts`).

The argument is optional and never blocks: pressing Enter runs the command without an action, and Tab fills the
dropdown first.

## Requirements

- macOS with [CleanShot X](https://cleanshot.com/) installed.
- **Enable the CleanShot X API**: CleanShot X > Settings > Advanced > "Enable API". Without it the URL scheme calls do
  nothing, and Asyar cannot detect that (the commands still appear to succeed).
- On first use Asyar shows a permission consent dialog; accept it, otherwise the command is dropped.

You can check the setup without Asyar: `open 'cleanshot://open-history'` in a terminal should show the history window.

## Permissions

| Permission | Why |
| --- | --- |
| `shell:open-url` with `permissionArgs: {"shell:open-url": ["cleanshot"]}` | Open `cleanshot://` URLs. Custom schemes must be declared explicitly; only this one scheme is allowed. |

Nothing else is requested (no network, shell, filesystem or clipboard access).

## How it works

All commands are `mode: "background"` and share one helper in `src/extension.ts` (`src/worker.ts` only boots the SDK
bridge): wait 150 ms, then
`opener.openUrl('cleanshot://...')`. The delay gives the host time to hide the launcher so it does not end up in the
capture. If opening fails, the error is logged and a HUD message is shown (opening can only fail on the launcher side, e.g.
the scheme is not handled; it cannot detect a disabled CleanShot X API). The URL building lives in `src/cleanshot.ts` (no SDK imports) and is
covered by `src/cleanshot.test.ts` and `src/extension.test.ts`.

Known limits (unverified on a real Asyar build, check by hand): the 150 ms delay may need tuning; opening a custom scheme
may succeed even when CleanShot X is missing or its API is off; how an optional dropdown behaves when skipped in the
Asyar UI.

## Not ported

Straightforward follow-ups (not blocked, just not done yet):

- Annotate and Pin: the bare URLs `cleanshot://open-annotate` and `cleanshot://pin` work without a `filepath`. An
  optional `filepath` text argument (`?filepath=<encoded>`) can be added later; Finder-selection fallback is not needed.
- Open Settings: `cleanshot://open-settings[?tab=<tab>]` with an optional `tab` dropdown.
- View Uploads: opens `https://cleanshot.cloud/`. `https` is allowed by default (`opener_scope.rs` in the launcher), so
  it needs no extra permission or scheme.

Larger work: Add Quick Access Overlay (needs a `filepath`), Record Screen at Preset and Manage Recording Presets (need
list/form UI, storage and screen sizes), and the Raycast-AI-specific command (no Asyar equivalent).

## Build and link

Requires Node.js with pnpm, or [Bun](https://bun.sh) (the commands below use Bun; replace `bun install` / `bun run` with
`pnpm install` / `pnpm run`, and the CLI line with `pnpm exec asyar ...`).

```bash
bun install
bun run check        # tsc --noEmit (vite build does not type-check)
bun run test:run     # vitest
bun run build        # vite build -> dist/
bunx --bun --package asyar-sdk asyar validate   # manifest + layout checks
bunx --bun --package asyar-sdk asyar build      # validate + build + verify dist/
bunx --bun --package asyar-sdk asyar link       # symlink into the Asyar extensions dir, register for dev loading
```

`asyar link` writes into `~/Library/Application Support/org.asyar.app/` (dev flavor: `asyar link --dev`). Afterwards
open Asyar and run each command. Re-run `asyar build` after code changes; re-open the launcher to load the new `dist/`.

## License

MIT, see [`LICENSE`](../LICENSE) at the repository root. Behavior was ported from the MIT-licensed Raycast `cleanshotx`
extension (only its documented URL scheme and command list are reused, no code is copied).
