# FFmpeg Filter Builderで使用するUI部品

`components/`には、このアプリで実際に使用している保守用の参照部品だけを残します。完成版はruntime時にこれらを読み込まず、同等のCSS / HTML / JavaScriptを`src/index.template.html`へ内包します。

## 確認ダイアログ

`components/confirm-dialog.html`は、破壊的操作や上書き確認の基準です。キーボード操作、`Esc`、フォーカス復帰、背景クリック、スマートフォンのSafe Area対応を維持します。

## Toast

`components/toast.html`は、短い状態通知と取り消し可能な操作の案内に使用します。安全に元へ戻せる操作ではUndoを優先します。
