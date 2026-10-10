# UI components used by FFmpeg Filter Builder

The app keeps two maintenance-reference snippets under `components/`. The final application does not load them at runtime; equivalent CSS/HTML/JavaScript is embedded in `src/index.template.html`.

## Confirmation dialog

`components/confirm-dialog.html` is the reference for destructive or overwrite confirmation UI. Preserve keyboard access, `Esc`, focus restoration, backdrop cancellation, and smartphone safe-area behavior.

The confirmation header never shrinks; the body owns short-viewport scrolling and safe-area padding. Root/body overflow is locked with `:has(dialog:modal)`, so closing the last native modal releases only this lock. `AppConfirm.ask` accepts an optional `returnFocus` element or function; use a function for a responsive logical opener when the initiating menu item becomes hidden. Visibility/disabled checks and request-scoped initial focus protect newer modal/editor ownership.

Explicit Palette/Inspector dismissal uses a synchronous visible return target. General sheet switching does not restore focus. Inspector node lookup uses the current rendered selected node, skips nodes clipped outside the canvas, and never changes graph selection or pan/zoom.

## Toast

`components/toast.html` is the reference for short status notifications and reversible actions. Prefer an Undo action for operations that can be safely reversed.
