# Reusable UI snippets

This repository keeps only the reusable snippets that are actually used by FFmpeg Filter Builder.

- `confirm-dialog.html` — destructive / overwrite confirmation dialog.
- `toast.html` — transient status and Undo-style notification UI.

The production app remains self-contained in `src/index.template.html`; these files are maintenance references, not runtime dependencies.
