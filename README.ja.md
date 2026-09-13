# FFmpeg Filter Builder

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-ffmpeg-filter-builder/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-ffmpeg-filter-builder/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/)

[English README](README.md)

MP4動画のFFmpeg Filter Graphをブラウザー上で組み立てるツールです。Video / Audio / Textの処理を編集可能なNodeとして構成し、内蔵FFmpeg WebAssemblyでPreviewし、そのまま動画全体を書き出せます。選択した動画をアプリからサーバーへアップロードしません。

## 🚀 Live demo

### [GitHub PagesでFFmpeg Filter Builderを開く](https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/)

GitHub Pagesから最初のHTMLを読み込んだ後、選択したMP4、Graph、Preview、Full Renderの処理はブラウザー内で行います。アプリから選択した動画をサーバーへアップロードしません。

## Features

- **Recipeから始めてもGraphを直接作っても使える** — 10種類のRecipeはブラックボックスではなく、通常の編集可能なNode / Edgeへ展開されます。
- **Graph Canvasを中心に編集** — Pan / Zoom / Fit、Node自由配置、複数選択、双方向drag-to-connect、MiniMapを備えたNode EditorとしてGraphを操作できます。
- **よく使うVideo filterをGUIで編集** — Trim、Speed、FPS、Scale、Crop、Pad、Rotate、Flip、Aspect Ratio、Color Adjust、Hue、Blur、Sharpen、Fadeに対応します。
- **分岐・合流Graphを構築** — Split / Overlayを使い、Picture in Pictureや背景ぼかしのようなbranch / merge構成を作れます。
- **Audioも同じGraphで処理** — Audio Trim、Volume、Fade、Speed、High-pass、Low-pass、Normalize、Split、Mixに対応し、Video Speed時の音声同期も行えます。
- **日本語・英語の文字を重ねる** — Draw Textは内蔵M PLUS 1p Regularを使い、位置、色、背景、余白、表示時間を設定できます。
- **PreviewとFull Renderで同じGraphを使用** — Previewだけ処理範囲を限定し、Full Renderでは同じGraphを入力動画全体へ適用します。
- **Graphプロジェクトを保存・復元** — Graph JSONの保存 / 読み込みと、端末内Autosaveによる前回Graph復元に対応します。動画ファイルはAutosaveしません。
- **Desktop FFmpeg commandを生成** — 現在のGraphをコピー可能なFFmpegコマンドへコンパイルできます。
- **Single-thread / Multi-thread版** — 標準版は`file://`から直接利用でき、高速版はHTTP(S) + cross-origin isolationを前提とします。
- **完全ローカル処理** — 生成HTMLにはFFmpeg WASMと標準フォントを埋め込み、runtime CSPは`connect-src 'none'`です。

## Quick start

### Web版を使う

[GitHub Pages版](https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/)を開き、MP4を読み込み、Recipeを選んでPreviewし、最後に動画を書き出します。登録やインストールは不要です。

### Windowsで単一HTMLを作る

1. このリポジトリをダウンロードまたはcloneします。
2. `build-standalone.bat`をダブルクリックするか、コマンドプロンプトから実行します。
3. 初回buildでは固定済みのFFmpeg WASM runtimeとM PLUS 1p font snapshotを取得して検証します。
4. 標準Single-thread版は`dist/index.html`です。
5. 必要なら生成したHTMLだけを保存し、オフライン用の単一ファイルとして利用できます。

通常のアプリbuild自体にNode.jsは必要ありません。Windows PowerShellでbuildします。

## Usage

1. Input NodeからMP4を読み込みます。
2. **Recipe**からやりたい処理を選んで**Graphへ展開**するか、Filter Nodeを直接追加します。
3. Nodeを選択して設定を変更します。Video / Audioの対応するportを接続して処理順を組み替えられます。
4. **Preview**で3秒 / 5秒 / 10秒の範囲を確認します。動画全体を毎回処理する必要はありません。
5. 問題なければ**動画を書き出す**で、同じGraphを入力動画全体へ適用します。
6. 生成されたH.264 + AAC MP4を確認し、必要ならファイル名を変更して保存します。

### Recipes

現在は以下の10種類です。

1. 720pへ縮小
2. 正方形Crop
3. 縦動画
4. 90°回転
5. Video + Audio Fade
6. Watermark
7. Picture in Picture
8. 背景ぼかし縦動画
9. 2倍速 + Audio同期
10. Audio Normalize

入力サイズや動画長に依存するRecipeは、動画を読み込んだ後に適用してください。

### Graph操作

**Graph操作**はFFmpeg filterではなく、Graph自体を管理するための補助操作です。

- Graph JSONを保存
- Graph JSONを開く
- Graph初期化（確認ダイアログあり）

Undo / RedoはGraph Toolbarから直接操作できます。旧バージョンにあったSplit + Overlay / Audio MixのサンプルGraphショートカットは、Recipeと役割が重なるため利用者向けメニューから削除しました。Video filters、Text、Complex graph、Audio filtersはPalette内で利用できます。

### スマートフォンでのGraph編集

スマートフォンではGraph Canvasを横幅いっぱいに表示し、Filter PaletteとNode Inspectorは下から開くBottom Sheetとして表示します。1本指でCanvasをPan、NodeをDragして移動でき、2本指のPinchでZoomできます。PortはDrag接続に加えて、開始Portと接続先Portを順にTapしても接続できます。

### Graph JSON / Autosave

**Graph JSONを保存**で編集可能なGraphプロジェクトを書き出し、**Graph JSONを読み込む**で復元できます。

Autosaveが保存するのはGraphと出力ファイル名だけです。選択したMP4や生成動画は保存しません。前回Graphを復元した場合も、動画ファイルはもう一度選択してください。

## 現在のMultiple Input境界

FFmpeg WASM Builder v1.9.8からこのアプリへ渡せるmain media inputは現在1つです。v1.1.0でもGraph Workspace刷新に集中するため、このv1.0.0の境界を維持します。

- **Watermark**: 別画像ではなくDraw Textによる文字透かし
- **Picture in Picture**: 2本目動画ではなく、同じ入力動画をSplitしたbranchを利用

別画像Watermarkや独立した2本目動画入力は、現時点では対応済みとはしていません。

## Browser support

主要対象はChrome / Edgeです。標準Single-thread版は`file://`で直接開いて使える構成です。Multi-thread版はcross-origin isolationと`SharedArrayBuffer`に対応したブラウザーおよびHTTP(S)配信が必要です。Firefox / Safariでは一部機能が動く可能性がありますが、v1.1.0でもChrome / Edgeを主要対象とします。

## 標準版 / Multi-thread版

| Build | ファイル | 実行方法 | 用途 |
| --- | --- | --- | --- |
| 標準版 | `dist/index.html` | `file://` またはHTTP(S) | Single-thread。持ち運べる単一HTML版 |
| 高速版 | `dist/index.mt.html` | COOP / COEP付きHTTP(S) | `SharedArrayBuffer`を使うMulti-thread版 |

WindowsでMulti-thread版をローカル確認する場合:

```bat
start-local-mt.bat
```

このローカルサーバーはcross-origin isolationに必要なheaderを付けます。

## GitHub Pagesで公開する

リポジトリにはstandalone buildと`dist`配信を行うGitHub Actions workflowが含まれています。

1. `ttomohisa/htmlapps-ffmpeg-filter-builder`としてpushします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main`へpushするか、Actionsから **Deploy standalone app to GitHub Pages** を手動実行します。
4. 配信後、標準版は`https://ttomohisa.github.io/htmlapps-ffmpeg-filter-builder/`で利用できます。

Pages workflowは固定済みのbuild inputからstandalone HTMLを再生成してから公開します。

## 開発・build構成

```text
.
├─ src/index.template.html       # アプリ本体template
├─ app.config.json               # アプリ情報 / build設定
├─ runtime.lock.json             # FFmpeg WASM Builder releaseの固定情報
├─ font.lock.json                # M PLUS 1p font snapshotの固定情報
├─ build-standalone.bat          # Windows build入口
├─ build-standalone.ps1          # ST / MT standalone builder
├─ scripts/                      # runtime準備・検証・repository check
├─ tests/                        # Graph / Preview / Filter / Recipe smoke test
└─ dist/                         # 生成されるstandalone成果物
```

通常build:

```bat
build-standalone.bat
```

固定済みbuild inputを再取得:

```powershell
.\build-standalone.ps1 -ForceDownload
```

FFmpeg WASM Builder開発時だけ、ローカルruntimeを指定できます。

```bat
build-with-local-ffmpeg.bat C:\path\to\htmlapps-ffmpeg-wasm-builder
```

buildではST / MTそれぞれの通常版・self-extract版HTMLとruntime / size manifestを生成します。

## Privacy / Runtime network protection

選択した動画、Graph、Draw Text内容、Preview結果、Full Render結果はブラウザー内で処理します。

生成されるアプリには以下を内蔵します。

- FFmpeg WebAssembly runtime
- M PLUS 1p Regular
- runtime Content Security Policyの`connect-src 'none'`
- GitHub / Google Fonts / CDNへの実行時依存なし

GitHub Pages版そのものを最初に開く通信と、ソースから初回buildするときの依存取得にはネットワークが必要です。完全にオフラインで使う場合は、一度buildした標準版`dist/index.html`をローカルで開いてください。

## Limitations

- 入力は現在、1つのmain MP4 media fileに限定しています。
- 出力形式はH.264 video + AAC audioのMP4です。
- 画像Watermark入力と、独立した2本目動画によるPicture in Pictureには未対応です。
- ブラウザー内で動画全体を再エンコードするため、長時間・高解像度動画ではCPU負荷とメモリ使用量が大きくなります。
- Multi-thread版は`file://`から直接実行できません。COOP / COEPと`SharedArrayBuffer`を利用できるHTTP(S)環境が必要です。
- MP4 containerを選択できても、内部codecや端末メモリの制約で処理できない場合があります。

## Embedded build inputs

| Component | Version / snapshot | License | 用途 |
| --- | --- | --- | --- |
| FFmpeg WASM Builder | v1.9.8 / `ffmpeg-filter-builder` profile | 生成runtime manifest / Third-party notices参照 | FFmpeg WebAssembly runtime、H.264/AAC処理、Filter |
| M PLUS 1p Regular | 固定Google Fonts snapshot | OFL-1.1 | Draw Text用の日本語 / 英語font |

ソースパッケージにはfont binaryをcommitしません。build時だけ`font.lock.json`に固定したsnapshotを取得・検証し、生成standalone HTMLへ埋め込みます。詳細は[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)を参照してください。

## Contributing

不具合報告や機能提案はGitHub Issuesで受け付けます。開発時の注意事項は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## License

Copyright © 2026 ttomohisa

[MIT License](LICENSE)で公開しています。
