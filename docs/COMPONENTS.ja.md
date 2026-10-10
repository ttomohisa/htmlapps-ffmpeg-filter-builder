# FFmpeg Filter Builderで使用するUI部品

`components/`には、このアプリで実際に使用している保守用の参照部品だけを残します。完成版はruntime時にこれらを読み込まず、同等のCSS / HTML / JavaScriptを`src/index.template.html`へ内包します。

## 確認ダイアログ

`components/confirm-dialog.html`は、破壊的操作や上書き確認の基準です。キーボード操作、`Esc`、フォーカス復帰、背景クリック、スマートフォンのSafe Area対応を維持します。

確認ヘッダーは縮めず、画面が低い場合のスクロールとSafe Area余白は本文が担当します。`:has(dialog:modal)`でroot/bodyの背景スクロールを固定し、最後のnative modalを閉じたときだけこの固定が解除されます。`AppConfirm.ask`の任意の`returnFocus`には要素または関数を渡せます。メニュー内の起点が非表示になる場合は、画面幅に合う表示中の起点を関数で解決します。表示・無効状態と要求単位の初期フォーカスを確認し、新しいダイアログや編集欄のフォーカスを奪いません。

一覧・設定の明示的な終了だけが同期的にフォーカスを戻します。シート切替では戻しません。設定を閉じると現在の描画済み選択ノードを探し、Canvas外へ隠れたノードを避けます。選択やPan / Zoomは変更しません。

## Toast

`components/toast.html`は、短い状態通知と取り消し可能な操作の案内に使用します。安全に元へ戻せる操作ではUndoを優先します。
