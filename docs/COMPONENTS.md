# UI components used by FFmpeg Filter Builder

The app keeps two maintenance-reference snippets under `components/`. The final application does not load them at runtime; equivalent CSS/HTML/JavaScript is embedded in `src/index.template.html`.

## Confirmation dialog

`components/confirm-dialog.html` is the reference for destructive or overwrite confirmation UI. Preserve keyboard access, `Esc`, focus restoration, backdrop cancellation, and smartphone safe-area behavior.

## Toast

`components/toast.html` is the reference for short status notifications and reversible actions. Prefer an Undo action for operations that can be safely reversed.
