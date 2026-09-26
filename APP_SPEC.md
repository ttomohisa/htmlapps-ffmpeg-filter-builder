# FFmpeg Filter Builder

## ノードをつないでFFmpegフィルターを組み立てる

### 正式仕様書 / v1.0.0

---

# 1. 概要

FFmpeg Filter Builderは、FFmpegのfiltergraphをGUI上のノード接続として組み立て、ブラウザ内のFFmpeg WebAssemblyで実際にプレビューし、最終的なFFmpegコマンドを生成できるWebアプリケーションとする。

基本フローは以下。

**動画・音声・画像を読み込む**

↓

**フィルターノードを追加する**

↓

**ノード同士を接続する**

↓

**パラメータを調整する**

↓

**実際のFFmpegでプレビュー**

↓

**FFmpegコマンドをコピー**

または

**ブラウザ内でそのまま書き出す**

---

# 2. プロダクトコンセプト

目的は「FFmpegの全機能をGUI化すること」ではない。

目的は、

> FFmpegのfiltergraphを、コマンド構文を暗記せず視覚的に組み立て、実際に動くことを確認してからコマンドとして持ち出せる

こと。

中心となる価値は、

**Visual Builder + Real FFmpeg Preview + Command Generator**

の3点。

---

# 3. 想定ユーザー

主な対象：

- FFmpegを使いたいがfiltergraph構文が難しい人
- 動画処理を自動化する開発者
- Shell / PowerShellスクリプトを書いている人
- FFmpegコマンドを試行錯誤したい人
- 動画処理の仕組みを学びたい人
- 複雑なoverlay / split / audio filterを視覚的に確認したい人

Browser Kittyの一般的な動画編集ツールより、やや開発者寄りとする。

---

# 4. 最重要要件：完全な単一HTML

配布物は **single-thread版 / multi-thread版の2系統** を同時に生成する。

ただし「単一HTML」という要件は維持し、**各版はそれぞれHTML 1ファイルだけで実行できること**を正式要件とする。

標準成果物：

```text
dist/index.html       # single-thread / portable build
dist/index.mt.html    # multi-thread / cross-origin-isolated build
```

両HTMLへ、それぞれ必要なものをすべて埋め込む。

- HTML
- CSS
- JavaScript
- favicon
- SVG icon
- graph editor
- Application Worker
- FFmpeg WebAssembly
- FFmpeg JavaScript runtime
- multi-thread版で必要なpthread Workerコード
- 必要なフォント
- Runtime manifest
- その他すべてのruntime dependency

実行時CDNは禁止。

外部FFmpeg binary取得は禁止。

multi-thread版についても、FFmpeg WASMやpthread Workerを実行時に外部URLから取得してはならない。必要なWorkerはBlob URL等を用いて、HTML内の埋め込みデータから生成する。

Release ZIPには2つのHTMLを含めるが、**どちらも単体で完結した単一HTML**とする。

---

# 5. Standalone要件

## 5.1 single-thread版

保存した `index.html` を、

```text
file://
```

から開いても基本機能が動くことを正式要件とする。

ネットワーク切断状態でも、

- ファイル読み込み
- graph編集
- command生成
- preview
- render
- graph JSON保存

まで利用可能とする。

single-thread版は、Browser Kittyの「保存して持ち運べる単一HTML」の基準となる。

## 5.2 multi-thread版

`index.mt.html` もHTML 1ファイルへ完全に自己完結させる。

ただしFFmpegのpthread実行には `SharedArrayBuffer` とcross-origin isolationが必要なため、**HTTP(S)で適切なレスポンスヘッダーを付けて配信すること**を正式要件とする。

想定ヘッダー：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

multi-thread版は起動時に、

```js
window.crossOriginIsolated
```

および `SharedArrayBuffer` の利用可否を確認する。

要件を満たさない環境ではFFmpeg処理を開始せず、

> 高速版を利用できない環境です。標準版を使用してください。

と平易に案内する。

`file://` からのpreview / render保証はsingle-thread版が担う。multi-thread版の `file://` 実行は正式サポート対象外とする。

---

# 6. FFmpeg Runtime / FFmpeg WASM Builder

FFmpeg runtimeは、**FFmpeg WASM Builder v1.9.8** を基準とし、Browser Kittyで共通利用している自前ビルド基盤から生成する。

`@ffmpeg/ffmpeg` / `@ffmpeg/core` の配布済みruntimeへ切り替えない。

現行Builder v1.9.8は、

- public `libav*` runner方式
- `ffmpeg-filter-builder` はsingle-thread / multi-threadの2 variant
- single-threadはSharedArrayBuffer不要で `file://` の単一HTML対応
- multi-threadはpthread / SharedArrayBufferを使い、HTTP(S) + COOP / COEPが必要
- Web Worker実行
- `--disable-everything` からprofile単位で機能を有効化
- profileごとの実ブラウザーsmoke test

を前提としている。

FFmpeg Filter Builderでは、この基盤を拡張して専用profileを追加する。

profile候補：

```text
ffmpeg-filter-builder
```

このprofileはv1.0で必要な、

- Demuxer
- Decoder
- Parser
- libavfilter
- Filter
- Encoder
- Muxer
- Protocol
- x264
- libvpx
- Opus
- その他正式採用したcodec library

だけを有効化する。

「FFmpegを全部入りにする」構成にはしない。

## 6.1 public libav runner

内蔵runtimeはFFmpeg本家CLIそのものをWASM化するのではなく、Builderの既存方針に合わせて **public libav APIのみを使うFilter Builder専用runner** を実装する。

Graph Compilerは1つの中間表現から、

1. デスクトップFFmpeg向けCLI command
2. Browser FFmpeg runner向けstructured request

の両方を生成する。

つまり、UIに表示したshell command文字列を、そのままブラウザ内FFmpegへ渡して実行する構造にはしない。

Browser preview / renderではshellを介さず、runnerへ以下のような構造化情報を渡す。

- Input mapping
- Filtergraph
- Stream mapping
- Output container
- Video codec
- Audio codec
- Preview range
- Output path

これによりshell escapingとブラウザ内実行を分離する。

## 6.2 Builder側に追加する責務

FFmpeg WASM Builder側では最低限、以下を追加する。

- `ffmpeg-filter-builder` profile
- Filter Builder専用public-libav runner
- single-thread / multi-thread build variant
- thread modeを含むruntime manifest
- 両variantのreal browser smoke test
- 両variantのRelease artifact
- single HTMLへ埋め込めるruntime出力
- Filter / Encoder / Decoder / Muxer capability manifest

Builderの更新はFilter Builderリポジトリへ生成済みruntimeを取り込む前に確定し、アプリ側でFFmpegを独自再ビルドしない。

---

# 7. Single-thread / Multi-thread 二系統runtime

v1.0から **single-thread版とmulti-thread版を同時に正式提供する。**

「multi-threadは将来候補」にはしない。

## 7.1 共通原則

2つのruntimeは、

- 同じFFmpeg version
- 同じBuilder version
- 同じFilter Builder profile
- 同じenabled filters
- 同じenabled decoders / encoders
- 同じcontainer対応
- 同じrunner API
- 同じGraph Compiler
- 同じUI機能

を共有する。

違いは原則として **threading capabilityと、それに伴う実行環境要件だけ** とする。

## 7.2 single-thread runtime

single-thread版は現在のBuilder方針を継承する。

- FFmpeg pthread無効
- Emscripten pthread無効
- SharedArrayBuffer不要
- COOP / COEP不要
- Application Worker内でFFmpegを実行
- `file://` 対応
- offline対応

可搬性・互換性を最優先する。

## 7.3 multi-thread runtime

multi-thread版ではBuilderを拡張し、Filter Builder profileに限ってpthread対応variantを生成できるようにする。

最低限の技術要件：

- FFmpeg pthread有効
- Emscripten `-pthread` 対応
- Shared WebAssembly Memory
- pthread Worker
- SharedArrayBuffer
- cross-origin isolation
- COOP / COEPを有効にしたHTTP(S)配信

x264等の外部codec libraryについても、multi-thread版では実際にthreadingを利用できるようBuilder側のビルド設定を分離する。

ただし、**multi-thread版だからすべてのfilterが必ず高速化するとは表示しない。**

filter / codec / 解像度 / 端末CPUによって効果が変わるため、UIでは単に「高速版」とし、詳細情報でmulti-thread実行であることを示す。

## 7.4 Thread pool

pthread Worker数は固定値をハードコードせず、v0.1.0の実測で決定する。

初期方針：

- `navigator.hardwareConcurrency` を参考にする
- ブラウザの過剰なWorker生成を避ける
- スマートフォンでは控えめな上限を設定する
- UI thread用の余力を残す

必要ならAdvanced設定として、

- Auto
- 2 threads
- 4 threads
- 6 threads

等を将来提供できる構造にする。

## 7.5 Runtime選択

同じHTML内にsingle-thread / multi-thread両WASMを二重埋め込みしない。

理由：

- HTMLサイズが大きくなる
- 初期展開メモリが増える
- release artifactの役割が曖昧になる

代わりに同一ソースから、

```text
index.html
index.mt.html
```

の2成果物を生成する。

Browser Kittyの配信環境ではmulti-thread版を利用できる導線を用意し、保存して持ち運ぶ用途ではsingle-thread版を案内する。

---

# 8. アプリ名

正式候補：

**FFmpeg Filter Builder**

日本語説明：

**ノードをつないでFFmpegフィルターを組み立てる**

英語：

**Build and preview FFmpeg filter graphs visually**

---

# 9. 基本画面構成

PCでは4領域を基本とする。

## 左

**フィルター一覧**

## 中央

**Graph Canvas**

## 右

**選択ノードの設定**

## 下

**Preview / FFmpeg Command**

下部panelは高さ変更・折りたたみ可能とする。

---

# 10. 初期画面

Graph Canvas中央に、

**動画・音声・画像を追加**

を表示。

Drag & Drop対応。

さらに、

**サンプルから始める**

を用意する。

---

# 11. Input Node

ファイルを読み込むとInput Nodeを生成する。

表示：

- ファイル名
- 種類
- Duration
- Resolution
- Video codec
- Audio codec
- FPS
- Sample rate
- Channels

---

# 12. Input NodeのPort

動画ファイル：

```text
Video
Audio

```

の2port。

音声ファイル：

```text
Audio

```

のみ。

画像：

```text
Video/Image

```

として扱う。

---

# 13. Media Type

Portは最低限、

- Video
- Audio

の2型に分ける。

Audio PortをVideo filterへ接続できないようにする。

不正接続はUI上で拒否する。

---

# 14. Graph Node

各filterを1つのnodeとして表現する。

例：

```text
Input
  ↓
Crop
  ↓
Scale
  ↓
FPS
  ↓
Output

```

---

# 15. 複雑なGraph

分岐・合流にも対応。

例：

```text
                 → Blur ───────┐
Input → Split                   → Overlay → Output
                 → Scale ──────┘

```

これをFFmpegの、

```text
split
scale
boxblur
overlay

```

等へcompileする。

---

# 16. Graph制約

禁止：

- Cycle
- Type不一致
- 必須input未接続
- 存在しないnodeへのedge
- 同一single-input portへの複数接続

問題のあるnodeを赤系error状態で表示。

---

# 17. Graph Compiler

Graph内部表現からFFmpeg filtergraphを生成する。

内部的に各streamへ自動labelを付ける。

例：

```text
[0:v]
↓
scale
↓
[n3v]
↓
crop
↓
[n4v]

```

最終的には、

```text
-filter_complex "[0:v]scale=1280:720[n3v];[n3v]crop=720:720[n4v]"
-map "[n4v]"

```

のようなcommandへcompileする。

ユーザーはlabelを自分で管理する必要はない。

---

# 18. Node IDとFFmpeg label

Node IDとFFmpeg stream labelは分離する。

Graph編集でnode順序が変わっても、

生成結果が安定するようにする。

---

# 19. v1.0 Video Filters

最低限以下を正式対応。

## Timing

- Trim
- Speed
- FPS

## Geometry

- Scale
- Crop
- Pad
- Rotate
- Horizontal Flip
- Vertical Flip
- Set Aspect Ratio

## Color

- Brightness
- Contrast
- Saturation
- Gamma
- Hue

## Effects

- Blur
- Sharpen
- Fade In
- Fade Out

## Composition

- Split
- Overlay
- Picture in Picture

## Text

- Draw Text

---

# 20. Trim Node

ユーザーには、

- Start
- End

だけを設定させる。

内部では必要に応じ、

```text
trim
setpts

```

を組み合わせる。

FFmpeg固有のPTSリセットをユーザーへ要求しない。

---

# 21. Speed Node

設定：

```text
0.25x ～ 4.0x

```

程度。

Video：

```text
setpts

```

Audio：

```text
atempo

```

へcompileする。

必要に応じて複数 `atempo` を自動chainする。

---

# 22. Scale Node

設定：

- Width
- Height
- Keep aspect ratio
- Fit
- Fill
- Even number correction

プリセット：

- Original
- 2160p
- 1440p
- 1080p
- 720p
- 480p

---

# 23. Crop Node

設定：

- X
- Y
- Width
- Height

Preview上でcrop rectangleを直接操作できる機能を将来的に想定する。

v1.0では数値UI + presetを正式範囲とする。

Preset：

- 16:9
- 9:16
- 1:1
- 4:3
- Custom

---

# 24. Pad Node

設定：

- Width
- Height
- X
- Y
- Background color

「16:9へ余白追加」などのpresetを提供する。

---

# 25. Rotate / Flip

Rotate：

- 90° CW
- 90° CCW
- 180°

Flip：

- Horizontal
- Vertical

自由角度rotateはv1.0では必須としない。

---

# 26. Color Adjustment

一つの、

**Color Adjust**

nodeへまとめる。

設定：

- Brightness
- Contrast
- Saturation
- Gamma

内部ではFFmpeg `eq` filterへcompile。

---

# 27. Blur

初期は、

- Box Blur
- Gaussian Blur

を対象。

Advanced設定でradius等を変更可能。

---

# 28. Sharpen

`unsharp` を利用。

UI：

- Amount
- Radius

程度へ簡略化する。

---

# 29. Fade

Video：

- Fade In
- Fade Out

Audioにも独立したAudio Fade nodeを用意する。

---

# 30. Overlay Node

2つのVideo inputを受け取る。

```text
Main
Overlay

```

設定：

- X
- Y
- Width
- Opacity

Position preset：

- Top Left
- Top Right
- Bottom Left
- Bottom Right
- Center

---

# 31. Picture in Picture

Overlay nodeのpresetとして提供する。

ユーザーが複雑なscale + overlay構成を手作業しなくても、

**Picture in Picture**

を追加すれば必要nodeを自動生成してよい。

---

# 32. Split Node

1つのVideo streamを、

複数branchへ分岐する。

v1.0：

**2 output**

を基本とする。

必要になればoutput追加可能な構造にする。

---

# 33. Draw Text

設定：

- Text
- Font size
- Text color
- Position
- Background
- Start time
- End time

標準フォントを単一HTMLへ埋め込む。

日本語を含む場合のfont size増加をv0.6.0で実測し、採用フォントを確定する。

ユーザーfont読み込みも将来候補とする。

---

# 34. Audio Filters

v1.0で以下を正式対応。

- Audio Trim
- Volume
- Fade In
- Fade Out
- Speed
- High-pass
- Low-pass
- Normalize
- Audio Mix

---

# 35. Volume

UI：

```text
-30 dB ～ +12 dB

```

または倍率表示。

---

# 36. Audio Speed

Video Speedと連動可能。

Video + Audioをまとめた、

**Speed**

recipeも提供する。

---

# 37. Audio Mix

2つ以上のAudio streamをmix。

初期v1.0では2inputを正式対象とする。

各input volumeを設定可能。

---

# 38. Output Node

Graphの終端。

v1.0では、

**Output Nodeは1つ**

とする。

Video input、Audio inputを持つ。

---

# 39. Output設定

最低限：

## Container

- MP4
- WebM
- GIF
- Audio only

## Video

- H.264
- VP9
- その他Filter Builder用runtime profileで正式対応するcodec

## Audio

- AAC
- Opus
- その他Filter Builder用runtime profileで正式対応するcodec

実際の一覧は **FFmpeg WASM Builderが生成するruntime manifest** と同期させる。

UIに存在するcodecは、single-thread / multi-threadの**両runtimeで利用可能であること**を必須とする。

どちらか一方だけに存在するcodec / filterを標準UIへ露出しない。

---

# 40. Command Generator

Graph変更時にcommandを即時再生成する。

表示：

```text
ffmpeg -i "input.mp4" \
-filter_complex "..." \
-map "..." \
-c:v libx264 \
-c:a aac \
"output.mp4"

```

---

# 41. Command View

Syntax highlightする。

視覚的に、

- Input
- Filter
- Map
- Codec
- Output

を区別する。

---

# 42. Node ↔ Command連携

Command内のfilter部分へmouse overまたはclickすると、

対応するGraph Nodeをhighlightする。

逆にnodeを選択すると、

Command内の対応部分をhighlightする。

これは本アプリの重要UXとする。

---

# 43. Shell形式

v1.0では最低限、

- Bash / zsh
- PowerShell

の2形式を生成する。

ファイル名や文字列を正しくescapeする。

---

# 44. Command安全性

ユーザー入力をcommandへ直接連結しない。

内部のescaping layerを必ず経由させる。

特に、

- Filename
- Draw Text
- Filter expression
- Output filename

を適切にescapeする。

ブラウザ内Previewではshellを使用せずFFmpeg argument arrayとして渡す。

---

# 45. Advanced Node

上級者向け：

**Custom Filter**

を用意する。

入力：

- Filter name
- Arguments

または、

raw filter expression。

ただし、

**Advanced**

として明確に分離する。

---

# 46. Custom FilterのPreview

現在のWASM runtimeにfilterが存在すればPreview可能。

存在しなければ、

**このフィルターは内蔵FFmpegではプレビューできません**

と表示。

ただしCommand生成は可能とする。

---

# 47. Filter対応状態

Filter paletteには、

**Preview対応**

または、

**Commandのみ**

の状態を持てる内部設計とする。

標準nodeはすべてPreview対応を必須とする。

---

# 48. Preview

Previewは、**Graph Compilerが生成した同一filtergraphを内蔵FFmpeg runtimeで実行する。**

Canvas/CSS等による疑似previewは禁止。

Browser runtimeはFFmpeg WASM BuilderのFilter Builder専用public-libav runnerを使い、filtergraphをlibavfilterへ渡して処理する。

表示用CLI commandとBrowser runnerは実行経路こそ異なるが、同じGraph IRから生成し、filtergraph / mapping / output設定の意味が一致することをテストする。

理由：

> 表示と実際のFFmpeg結果が違う

問題を避けるため。

single-thread版 / multi-thread版でもGraphの意味と出力結果が一致することを回帰対象とする。

---

# 49. Preview Button

Graph変更のたびに自動renderしない。

ボタン：

**プレビューを更新**

を使用する。

Graph変更後は、

**変更があります**

状態を表示する。

---

# 50. Preview品質

Preview時は速度優先。

必要に応じ、

- Resolution制限
- Fast encoding preset
- Short duration

を使用する。

ただしfiltergraph自体は本番と同一。

---

# 51. Preview長

初期：

**5秒**

選択肢：

- 3秒
- 5秒
- 10秒

---

# 52. Preview位置

v1.0では、

**Preview start**

を指定可能にする。

例：

```text
00:01:30

```

から5秒preview。

複雑graphで正確なseekが困難な場合には、

Output側でpreview範囲を制御する。

---

# 53. Preview Cache

以下からhashを生成。

- Graph
- Parameters
- Preview range
- Input fingerprint

同じ条件なら既存previewを再利用可能とする。

---

# 54. Preview Cancel

処理中：

**中止**

可能。

Workerをterminateしてもgraphやinputは保持する。

---

# 55. Full Render

Command生成だけでなく、

**この設定で書き出す**

を提供。

FFmpeg WASMで最終ファイルを生成する。

---

# 56. Render Progress

表示：

- %
- Elapsed
- FFmpeg log
- Cancel

FFmpeg logは通常折りたたむ。

---

# 57. Render完了

表示：

- Filename
- File size
- Duration
- Download / 保存

同一タブ内でpreview可能なら表示する。

---

# 58. 大容量ファイル

WASMのmemory制約があるため、

巨大動画を無条件に処理できるとは表示しない。

ファイルサイズと端末memoryを考慮し、

必要に応じてwarning。

例：

> 大きな動画はブラウザのメモリ制限により処理できない場合があります。

---

# 59. Input数

v1.0 UIでは、

**最大4 Input**

を推奨上限とする。

Graph内部構造には固定上限を設けない。

---

# 60. Graph保存

GraphをJSONとして保存可能。

拡張子候補：

```text
.ffgraph.json

```

または通常の、

```text
.json

```

---

# 61. Graph JSON

保存内容：

- Version
- Nodes
- Edges
- Parameters
- Output settings
- Preview settings
- Input metadata

ファイル本体は含めない。

---

# 62. Graph再読込

JSONを読み込み、Graphを復元する。

Graph JSON / Autosaveへ保存するのはInputの `kind` / filename / size / lastModified / MIMEなどのmetadataだけとし、File本体・Blob・絶対pathは保存しない。

復元後にruntime File bindingがないInputは **Missing Input** として表示する。複数のMissing Inputがある場合は「素材をまとめて再選択」から複数ファイルを選択でき、media kind + filename + sizeで一致するInputへ自動relinkする。`lastModified` / MIMEは複数候補がある場合の優先度へ使用する。

同じbrowser session内でGraph JSONを開き直す場合は、現在memory上に保持しているFile objectのうちmetadataが一致するものを再利用してよい。永続化はしない。

Canvasへ複数ファイルをDropした場合も、Missing Inputへの一致を先に試し、一致しなかった対応ファイルだけを新しいInputとして追加する。

---

# 63. Autosave

Graph自体はIndexedDBへ自動保存可能。

ページreload時：

**前回の作業を復元**

を表示。

Media Fileそのものの永続保存は原則行わない。

---

# 64. Undo / Redo

以下を対象。

- Node add/delete
- Connection
- Node move
- Parameter
- Output settings

最低50操作。

---

# 65. Copy / Duplicate

Node：

- Duplicate
- Copy
- Delete

を提供。

複数node selectionも将来対応可能な構造にする。

---

# 66. Filter Search

左palette：

検索可能。

例：

```text
blur
crop
audio
speed

```

日本語UIでもFFmpeg filter名を併記する。

例：

**ぼかし / boxblur**

---

# 67. Filter説明

Node追加前または設定panelに、

短い説明を表示。

例：

**Crop**

> 映像の一部を切り抜きます。

Advanced欄：

```text
FFmpeg filter: crop

```

を表示。

---

# 68. Parameter UI

基本設定は人間向けにする。

例：

```text
Width: 1280
Height: 720

```

Advancedを開くと、

FFmpegに近いoptionを確認可能。

---

# 69. Recipe

空のGraphからすべて作らせない。

v1.0ではRecipeを提供する。

現在のRecipe（22種類）：

- サイズ・向き: 720pへ縮小 / 1080pへ縮小 / 正方形Crop / 縦動画 / 背景ぼかし縦動画 / 16:9横動画 / 背景ぼかし正方形 / 90度回転 / 左右反転 / 30fps
- 合成・見た目: Fade In / Out / Watermark / Logo Overlay / Picture in Picture / 中央タイトル / モノクロ / 少しシャープ
- 時間・音声: 最初の10秒 / 0.5倍速 / 1.5倍速 / 2倍速 / 音量を整える

入力サイズや動画長が必要なRecipeは、事前読み込みを要求せず、Recipeから直接動画選択へ進んでメタデータ取得後にGraphを生成する。

---

# 70. Recipe展開

Recipeを選択すると、

実際のGraph Nodeとして展開する。

ブラックボックス処理にしない。

ユーザーは、

> この処理がFFmpegではどう組まれているか

をGraphから学べる。

これは本アプリの重要な特徴とする。

---

# 71. 背景ぼかしRecipe

代表的なcomplex filter例。

概念：

```text
Input
 ├→ Scale/Crop → Blur ─────┐
 └→ Scale ─────────────────→ Overlay

```

これを1clickで生成する。

「複雑なFFmpegが視覚的に理解できる」デモとしても利用する。

---

# 72. Watermark Recipe

Input：

- Video
- Image

Graph：

```text
Video ──────────┐
                → Overlay → Output
Image → Scale ──┘

```

---

# 73. Validation

Command生成前からreal-time validationする。

Error：

- 未接続port
- Type mismatch
- Cycle
- Invalid value
- Missing input
- Missing output
- Unsupported codec

Warning：

- Extreme resolution
- Extreme bitrate
- Very large file
- Slow filter
- Browser memory risk

---

# 74. Compile Error

FFmpegがfiltergraphをrejectした場合、

raw FFmpeg logをそのままユーザーへ投げない。

例：

> Overlayの2番目の入力が接続されていません。

のような可能な限り具体的な説明を表示。

詳細欄でFFmpeg logを確認可能。

---

# 75. Unsupported Filter

FFmpeg WASM Builderが生成したruntime manifestにfilterが存在しない場合、起動時またはCIで検出する。

UIだけ存在してruntimeにfilterがない状態を禁止する。

さらにsingle-thread / multi-thread間で標準filterのcapability差分がないことをCIで確認する。

Custom Filterだけはmanifest上で存在しないfilterでもCommand生成を許可できるが、その場合Preview / Renderは不可とする。

---

# 76. FFmpeg Runtime Manifest

FFmpeg WASM Builderのbuild時に、各variantについて最低限以下をmanifest化する。

- Builder Version
- FFmpeg Version / commit
- Thread Mode (`single` / `multi`)
- Requires SharedArrayBuffer
- Requires Cross-Origin Isolation
- Enabled encoders
- Enabled decoders
- Enabled filters
- Enabled demuxers
- Enabled muxers
- Enabled parsers
- Enabled libraries
- Runner API version
- WASM SHA-256
- JS runtime SHA-256

例：

```json
{
  "profile": "ffmpeg-filter-builder",
  "threadMode": "multi",
  "requiresSharedArrayBuffer": true,
  "requiresCrossOriginIsolation": true
}
```

アプリ側のfilter catalog / codec catalogとCIで照合する。

また、ST / MT manifestのcapability setが同一であることを確認する。

---

# 77. Single HTML Builder / Dual Build

release buildでは同じソースから2つの単一HTMLを生成する。

共通処理：

1. JS bundle
2. CSS inline
3. SVG inline
4. favicon inline
5. Application Worker inline
6. FFmpeg WASM inline
7. FFmpeg JS runtime inline
8. Font inline
9. Runtime manifest inline

multi-thread版ではさらに、

10. pthread Worker runtime inline
11. Worker Blob URL生成処理

を含める。

最終成果物：

```text
dist/
├─ index.html
└─ index.mt.html
```

`index.html`：

- single-thread
- `file://` 正式対応
- GitHub Pagesの `/` で動作
- COOP / COEP不要

`index.mt.html`：

- multi-thread
- HTML自体は完全自己完結
- HTTP(S)配信必須
- COOP / COEP必須
- Browser Kittyの対応ルートで配信

GitHub Pages配信用にはstandalone成果物を変更せず、build後に `pages-dist/mt/index.html` を別途生成する。GitHub Pages上の `/mt/` だけは、server headerが使えない場合のfallbackとして同一originの `coi-serviceworker` を条件付きで読み込む。server側ですでに `crossOriginIsolated === true` の場合はfallback workerを読み込まない。

release ZIPには両方を含める。

---

# 78. HTMLサイズ

v0.1.0で **single-thread版 / multi-thread版の両方** に実FFmpeg runtimeを埋め込み、最終HTMLサイズを測定する。

初期size budget：

**各HTML 60MB以内を目安**

とする。

ただし、現在のFFmpeg WASM BuilderでFilter Builder専用profileを実際に生成したサイズを優先し、v0.1.0終了時に正式budgetを決定する。

評価項目：

- ST HTML size
- MT HTML size
- WASM size
- pthread Worker追加分
- embedded font size
- 起動時展開メモリ

ST / MTを1つのHTMLへ二重埋め込みしてsize budgetを消費しない。

不要codec・filterを増やさない。

---

# 79. Runtime Profile

FFmpeg Filter Builder用runtimeは、FFmpeg WASM Builderへ専用profileとして追加する。

profile：

```text
ffmpeg-filter-builder
```

thread modeはprofileを複製せず、Builderのbuild variantとして扱うことを基本とする。

概念：

```text
ffmpeg-filter-builder + single
ffmpeg-filter-builder + multi
```

これによりFFmpeg flags / capability catalogの二重管理を避ける。

v1.0で必要な、

- Demux
- Decode
- Filter
- Encode
- Mux

だけを有効化する。

Builder側で2variantを連続buildし、両方のsmoke testが通った場合のみFilter Builder用runtimeをrelease可能とする。

---

# 80. Font

Draw Text用fontも単一HTMLへ含める。

日本語・英語双方で最低限利用可能なフォントを採用。

Font assetがサイズを大幅に増やす場合は、

v0.6.0で、

- 日本語font subset
- ユーザーfont
- Draw Text仕様

を再評価する。

ただし外部CDNには逃がさない。

---

# 81. Mobile

スマートフォンでも、

- Graph閲覧
- Node追加
- Node接続
- Parameter編集
- Preview
- Commandコピー

を可能にすることを目標とする。

主要操作は下部固定の **追加 / 戻す / 全体 / その他 / Preview** にまとめ、Canvas上部へ横スクロールToolbarを残さない。

ただし複雑Graph編集とFull RenderはPC推奨。

---

# 82. Touch UI

スマートフォンでは、

- Filter PaletteをBottom Sheet化する
- Node InspectorをBottom Sheet化する
- Nodeを1回TapするとInspectorを開く
- Node追加直後はそのNodeの設定へ進む
- Inspectorには明示的な「完了」を置く
- 削除などNode自体への操作はParameter設定と視覚的に分離する
- Bottom Sheet表示中は背景Canvasへの誤操作を防ぐ
- 下部固定Action BarとToast / Popoverはsafe areaを考慮する
- Connection操作はtouch targetを十分大きくする


---

# 83. Keyboard

PC：

- Delete → Node削除
- Ctrl/Cmd + Z → Undo
- Ctrl/Cmd + Shift + Z → Redo
- Ctrl/Cmd + S → Graph保存
- Ctrl/Cmd + C → Command copyではなく通常copyを尊重
- Esc → selection解除

---

# 84. Accessibility

Nodeの意味を色だけで表現しない。

Video / Audio Portには、

- Icon
- Label
- Shape

も使用。

Keyboard操作可能な範囲を確保。

---

# 85. Privacy

ユーザーの動画・音声・画像は外部送信しない。

UIに、

**ローカル処理**

を明示。

ネットワーク通信なしで基本処理可能。

---

# 86. 外部通信

実行時：

**0を原則**

とする。

Analytics等をアプリ内部へ入れない。

Browser Kitty外側のサイト計測とは分離する。

---

# 87. v1.0 Scope外

以下は正式範囲外。

- FFmpeg全filter対応
- FFmpeg CLI完全再現
- Command → Graph逆変換
- Shell command parser
- 複数Output
- Batch processing
- Cloud rendering
- Cloud save
- Shared URL
- Collaborative editing
- Plugin system
- AIによるgraph生成
- Live camera input
- Live streaming
- HLS/DASH制作

---

# 88. 将来候補

v1.x：

- Command → Graph import
- Multiple Output
- Concat
- Chroma Key
- Subtitle filter
- LUT
- Mask
- Audio EQ
- Compressor
- Sidechain
- More generators
- Custom font
- User-defined filter catalog
- Graph URL encode
- Batch
- WebCodecs preview acceleration
- Runtime thread数の詳細設定
- ST / MT性能ベンチマーク表示

multi-thread build自体は将来候補ではなく、v1.0から正式対象とする。

---

# 89. Repository候補

```text
htmlapps-ffmpeg-filter-builder

```

---

# 90. 開発方針

参考プロジェクトのコードを移植するのではなく、Browser Kitty templateと **FFmpeg WASM Builder** から独自実装する。

Graph model / compiler / UIも独自設計する。

責務は次のように分離する。

```text
FFmpeg WASM Builder
  ├─ FFmpeg / Emscripten / codec library pin
  ├─ ffmpeg-filter-builder profile
  ├─ public-libav runner
  ├─ ST runtime build
  ├─ MT runtime build
  ├─ manifest
  └─ browser smoke test

FFmpeg Filter Builder app
  ├─ Graph UI
  ├─ Graph model
  ├─ Validation
  ├─ Graph Compiler / IR
  ├─ CLI Command Generator
  ├─ Browser runner adapter
  ├─ Preview / Render UX
  └─ ST / MT single-HTML packaging
```

アプリ側でFFmpegソースを直接ビルドしたり、Builderと別系統のruntime設定を持ったりしない。

---

# 91. 開発計画

---

## v0.1.0 — FFmpeg WASM Builder連携 / ST・MT Dual Runtime PoC

### 目的

**FFmpeg WASM BuilderへFilter Builder専用profileを追加し、single-thread / multi-threadの両runtimeを同時に成立させる。**

アプリのGraph UIを作り込む前に、runtime基盤を確定する。

### FFmpeg WASM Builder側

- Builder v1.9.4を基準に作業開始
- `ffmpeg-filter-builder` profile追加
- Filter Builder専用public-libav runner追加
- dynamic filtergraph実行
- MP4 input
- H.264 decode
- Scale filter
- H.264 encode
- MP4 mux
- WORKERFS input
- ST build variant
- MT build variant
- ST manifest
- MT manifest
- ST browser smoke test
- MT browser smoke test
- Release artifact生成

### Multi-thread基盤

- FFmpeg pthread build
- Emscripten pthread link
- pthread WorkerはEmscripten main scriptを `mainScriptUrlOrBlob` で再利用
- SharedArrayBuffer確認
- crossOriginIsolated確認
- x264のthread対応build
- thread pool方針の実測

### アプリ側

- 最新Browser Kitty template導入
- FFmpeg runtime取り込み
- Application Worker inline
- pthread Worker inline
- WASM inline
- `index.html` 生成
- `index.mt.html` 生成
- MP4 input
- Scale設定
- 5秒preview
- Cancel
- FFmpeg log
- CLI command生成

### Test Graph

```text
input.mp4
↓
scale=640:-2
↓
output.mp4
```

### 計測

ST / MTそれぞれで：

- HTML size
- Startup time
- WASM init time
- 5秒preview render time
- Full render time
- Peak memory
- Worker数
- thread利用状況

### Gate A — single-thread

保存した `index.html` をofflineの `file://` から開き、動画を読み込み、ScaleしてPreviewできること。

### Gate B — multi-thread

COOP / COEPを設定したローカルHTTP環境で `index.mt.html` を開き、

```text
crossOriginIsolated === true
```

を確認したうえで、pthread Workerが起動し、同じ動画をScaleしてPreviewできること。

### Gate C — parity

ST / MTで、

- 同じGraphを受理する
- 同じfilters / codecsを持つ
- 同じ解像度 / duration / stream構成を出力する

こと。

bitstreamの完全一致は必須としない。

### v0.1.0実装メモ

FFmpeg WASM Builder v1.9.4の `ffmpeg-filter-builder` runnerは、`scale` とMP4出力には対応しているが、preview duration / rangeをrunner引数としてまだ公開していない。

そのためv0.1.0アプリの初期実装では、**実FFmpegで入力全体を変換した結果を生成し、画面上のPreview再生を先頭5秒までに制限する。** Canvas / CSSによる疑似Previewへ置き換えない。

「FFmpeg処理自体を5秒だけに限定する」最適化は、Builder runnerへduration/rangeを追加した時点でこのGateへ統合する。これは既知のPoC制約であり、v1.0の正式Preview要件を緩和するものではない。

---

## v0.2.0 — Graph Core / Compiler

### 目的

ノードグラフからFFmpeg commandとBrowser runner requestを生成する基盤を完成させる。

### 実装

- Node model
- Edge model
- Port type
- Video / Audio type
- Graph Canvas
- Node add/delete
- Connection
- Cycle detection
- Validation
- FFmpeg label generator
- Graph IR
- `filter_complex` compiler
- Browser runner request compiler
- Input Node
- Output Node
- Scale
- Crop
- Rotate
- Generated command panel
- Undo / Redo

### Gate

GUIだけで、

```text
Input → Crop → Scale → Output
```

を作り、生成commandとST / MT両Previewの意味が一致する。

---

## v0.3.0 — Preview Engine

### 目的

Graphを実際のFFmpegで素早く確認できるようにする。

### 実装

- Preview panel
- 3 / 5 / 10 sec
- Preview start
- Preview render
- Progress
- Cancel
- Graph hash
- Preview cache
- stale preview表示
- Error mapping
- Full FFmpeg log
- runtime variant表示

### Gate

ST / MT双方でGraph変更 → Preview → 再変更 → Previewを繰り返してもWorker / memoryが破綻しない。

Cancel後もGraph / Inputを保持する。

---

## v0.4.0 — Video Filter Set

### 目的

日常的なvideo filterを揃える。

### 実装

- Trim
- Speed
- FPS
- Scale
- Crop
- Pad
- Rotate
- Flip
- Aspect Ratio
- Color Adjust
- Hue
- Blur
- Sharpen
- Fade

各node：

- Human-readable UI
- Advanced option
- Help
- Validation

### Builder確認

追加filterがFilter Builder profileのST / MT両manifestへ存在することをCIで確認する。

### Gate

すべての標準nodeについて、

**Graph → Command → ST Preview → MT Preview**

が同じ処理を表現する。

### v0.4.0 実装時のruntime差分

FFmpeg WASM Builder v1.9.5の `ffmpeg-filter-builder` profileではvideo `trim` が追加され、`startTimeSeconds` / `durationSeconds` と `timeRangeRender: true` が公開された。

そのためv0.4.0ではTrimをBrowser Previewでも有効化し、3 / 5 / 10秒とPreview startを実FFmpeg処理へ反映する。時間軸に依存しないGraphは選択範囲を直接renderし、Trim / Speed / Fadeを含むGraphはfilterの時間意味を壊さないよう入力先頭から必要なsource horizonまでを限定renderする。

Builder v1.9.7では、bounded rangeのfilterが正常にEOFへ到達した場合を成功としてflush/trailer生成へ進むよう修正し、caller-supplied filterの出力dimensionをencoderへ引き継ぐ。これにより `scale=480:-2` のようなGraph結果が元解像度へ戻されない。

---

## v0.5.0 — Complex Filtergraph

### 目的

FFmpeg Filter Builderらしい分岐・合流を完成させる。

### 実装

- Split
- Overlay
- 2-input node
- Multiple input files
- Picture in Picture
- Overlay position preset
- Image input
- Watermark
- Branch label compiler
- Complex mapping
- Connection validation

### Regression Graph

```text
Input
 ├→ Blur ──────┐
 └→ Scale ─────→ Overlay → Output
```

### Gate

分岐・合流graphをST / MT双方で安定してcompile / previewできる。

---

## v0.6.0 — Audio Filter Set

### 目的

映像だけでなく、Video / Audioの型付きGraphとして実用的なcompositionへ進める。

### 実装

- Input / OutputへVideo / Audio portを追加
- Audio Trim
- Volume
- Audio Fade
- Audio Speed
- High-pass
- Low-pass
- Normalize
- Audio Split
- Audio Mix
- Video SpeedとAudio atempoの同期
- Video / Audio型不一致接続の拒否
- Desktop / Browser双方のAudio filter compiler

Draw Textはこのmilestoneから分離し、次段で実装する。

### Gate

Video / Audioを含むGraphを、

- ST: offlineの `file://` 単一HTML
- MT: cross-origin-isolated配信の単一HTML

の両方でcompile / previewできる。

---

## v0.7.0 — Command Builder仕上げ

### 目的

「FFmpegコマンドを作るツール」として完成度を上げる。

### 実装

- Bash output
- PowerShell output
- Syntax highlight
- Copy
- Node ↔ Command highlight
- Advanced Custom Filter
- Preview対応状態
- Command-only filter
- Output codec設定
- Filename escaping
- Drawtext escaping
- Filter expression validation
- runtime manifest連携

### Gate

生成したcommandをデスクトップFFmpegへコピーし、同等結果を再現できる。

同じ標準GraphがST / MTどちらのBrowser runtimeでも実行できる。

---

## v0.8.0 — Recipes / Full Render

### 目的

FFmpegに詳しくないユーザーでも使えるようにする。

### Recipes

- Resize 720p
- Square Crop
- Vertical Video
- Rotate
- Fade
- Watermark
- Picture in Picture
- Blur Background
- 2x Speed
- Audio Normalize

### 実装

- Recipe selector
- Graph auto-generation
- Full Render
- Output filename
- Output size
- Download / Save
- Graph JSON save
- Graph JSON load
- Autosave
- Previous session recovery
- ST / MT版の案内
- MT利用不可時のST誘導

### Gate

初見ユーザーがRecipeから入り、Graphを理解せずとも動画を書き出せる。

同一RecipeをST / MT双方で処理できる。

---

## v0.9.0 — Release Candidate / 回帰・堅牢性

### 目的

正式リリース候補。

### 回帰

Graph：

- Linear
- Split
- Overlay
- Video + Image
- Video + Audio
- Audio Mix
- Text
- Custom Filter

Input：

- MP4
- WebM
- Image
- Audio

環境：

- Chrome
- Edge
- Firefox
- Safari

### single-thread確認

- `file://`
- Offline
- GitHub Pages
- SharedArrayBufferなし
- COOP / COEPなし

### multi-thread確認

- GitHub Pages `/mt/` のCOI service worker fallback
- Browser Kitty / Azure Static Web Apps相当の配信
- COOP `same-origin`
- COEP `require-corp`
- `crossOriginIsolated === true`
- SharedArrayBuffer利用可能
- pthread Worker起動
- unsupported環境で適切な案内

### 共通確認

- Large file
- Invalid media
- Corrupt graph
- Unsupported codec
- Unsupported filter
- Worker crash
- Cancel
- Repeated preview
- Repeated render
- OOM
- Mobile
- Touch
- Keyboard
- Accessibility

### Single HTML

ST：

- 外部runtime assetなし
- CDNなし
- Worker外部fileなし
- WASM外部fileなし
- Font外部fileなし
- favicon埋め込み

MT：

- 外部runtime assetなし
- CDNなし
- Application Worker外部fileなし
- pthread Worker外部fileなし
- WASM外部fileなし
- Font外部fileなし
- favicon埋め込み

### Builder regression

- BuilderのFilter Builder profile smoke test
- ST build
- MT build
- capability manifest parity
- runtime SHA確認
- pinned FFmpeg / Emscripten / codec library記録

### Documentation

- README
- APP_SPEC
- supported filters
- supported codecs
- ST / MTの違い
- MT配信要件
- privacy
- licenses
- third-party notices
- screenshot JA
- screenshot EN

---

## v1.0.0 — 正式リリース

### 最終作業

- 全体回帰
- version正式化
- README / APP_SPEC / CHANGELOG正式化
- screenshot JA / EN更新
- 日本語 / English確認
- favicon / 左上ブランドアイコン統一
- FFmpeg WASM Builder v1.9.8 release asset / SHA-256 pin確認
- ST / MT runtime parity確認
- `index.html` / `index.mt.html` / self-extract版生成
- GitHub Pages build / Browser Kitty配信確認
- Browser Kitty MT routeのCOOP / COEP header確認
- Filter / Recipe一覧確認
- Browser compatibility確認
- License / notice確認
- repository内のテンプレート由来不要ファイル削除

### Release Gate

**ST / MTのどちらか一方でもruntime smoke testまたは主要回帰が失敗した状態ではv1.0.0を出さない。**

ソース側の正式版仕上げと自動テストが完了していても、Windows実機でのstandalone build、ST / MTブラウザー確認、配信header確認が未実施ならGitHub Releaseは行わない。

---

# 92. v1.0.0完成条件

以下をすべて満たす。

1. Single-thread版 `dist/index.html` がHTML 1ファイルで生成される
2. Multi-thread版 `dist/index.mt.html` もHTML 1ファイルで生成される
3. ST / MTそれぞれのFFmpeg WASM runtimeと必要Workerが各HTML内に埋め込まれている
4. Draw Text用M PLUS 1p RegularとOFL情報が生成HTML内に含まれる
5. runtime CDN / 外部font / analytics / telemetry依存がない
6. ST版が `file://` で動作する
7. MT版がCOOP / COEP配信下で `crossOriginIsolated === true` となり、SharedArrayBuffer / pthread runtimeが動作する
8. 1つのMP4 main media inputからVideo / Audio streamを扱える
9. Video / Audioの型付きNode / Edgeを接続でき、cycleや不正接続を拒否できる
10. GraphからVideo / Audio filtergraphとDesktop FFmpeg commandを生成できる
11. 3 / 5 / 10秒Previewと開始位置指定が動作し、bounded PreviewがFull Renderへ漏れない
12. Full Renderが同じGraphを入力動画全体へ適用できる
13. Split / Overlay、Audio Split / Mixを含むbranch / merge Graphが動く
14. Video Speed + Audio同期が動く
15. Draw Textで日本語 / 英語を描画できる
16. 10種類のRecipeが通常の編集可能なGraphへ展開される
17. Graph JSONを保存 / 読み込みできる
18. AutosaveがGraphと出力ファイル名だけを保存し、入力動画や生成動画を保存しない
19. ST / MTで同じGraph / Recipe / Preview / Full Render機能を提供する
20. ST / MT runtime catalogと必要capabilityが一致する
21. FFmpeg WASM Builder v1.9.8の`ffmpeg-filter-builder` profileをSHA-256固定で使用する
22. 入力動画・Draw Text内容・Graph・生成動画をアプリから外部サーバーへ送信しない
23. 日本語 / 英語UI、PC / スマートフォン、キーボード操作の主要導線が成立する
24. faviconと左上ブランドアイコンが同じ`assets/favicon.svg`を基準に生成される
25. README / APP_SPEC / CHANGELOG / LICENSE / THIRD_PARTY_NOTICES / screenshotが正式版状態になっている
26. 未対応の独立画像Watermark・2本目動画PiP・複数media inputを対応済みと表示しない
27. MT要件を満たさない環境で誤動作せず、標準ST版を案内できる

---

# 93. 成功基準

最大の評価ポイントは対応filter数ではない。

以下を重視する。

### 1

FFmpegを知らなくても、

**ノードを見れば処理の流れが理解できる。**

### 2

FFmpegを知っている人なら、

**生成commandをそのまま仕事へ持ち出せる。**

### 3

Graphとcommandが常に同期している。

### 4

Previewは疑似表示ではなく、

**本物のFFmpeg結果。**

### 5

複雑なfiltergraphが、

```text
Input → Split → Blur / Scale → Overlay → Output

```

のように視覚的に理解できる。

### 6

アプリ自身も、

**HTMLファイル1個**

で持ち運べる。

---

# 94. 最終プロダクト像

FFmpeg Filter Builderは、

**「FFmpegを簡単にするツール」**

というより、

> **FFmpegのfiltergraphを見える形にするツール**

とする。

GUIだけに閉じず、

常に本物のFFmpeg commandを横に表示する。

そのため、

**初心者にはBuilder**

として、

**経験者にはCommand Generator**

として、

**学習用途にはFFmpeg visualizer**

として使える。

最終的な操作体験：

> ファイルを入れる
> → ノードをつなぐ
> → 設定する
> → プレビューする
> → コマンドをコピーする

必要なら、

> → そのまま書き出す

までブラウザだけで完結させる。
---

## v0.2.0 実装メモ（2026-09-08）

v0.2.0では正式ロードマップの Graph Core / Compiler を実装する。

実装済みの中心範囲：

- Node model / Edge model
- `video` port type（将来の `audio` typeを追加できるデータ構造）
- Input / Crop / Scale / Rotate / Output node
- Graph Canvasとport接続
- Node追加・削除
- Undo / Redo
- Cycle検出
- 必須input / output、single-input、v0.2.0線形Graph制約のvalidation
- Topological sort
- FFmpeg stream label generator
- Graph IR
- Desktop FFmpeg `filter_complex` command compiler
- Builder v1.9.7 Browser runner向けstructured request compiler
- 同一Graphからsingle-thread / multi-thread Previewを実行

v0.2.0〜v0.4.0のBrowser Previewでは、検証済みの**線形Graph**を同義の `videoFilter` chainへcompileしてrunnerへ渡した。Desktop向けcommandは `filter_complex` とstream labelを生成する。v0.5.0では同じrunnerのpublic-libav filter parserを利用し、外部source/sinkをunlabeledのまま内部branch labelを生成することでSplit / Overlayの分岐・合流へ拡張する。


---

## v0.3.0 実装メモ（2026-09-08）

正式ロードマップの Preview Engine を実装する。

- 3 / 5 / 10秒のPreview再生範囲
- Preview start
- Progress / Cancel
- deterministic Graph hash
- Input session + runtime variant + Graph hashによるメモリ内Preview cache
- cache上限: 2件 / 128 MB
- Graph変更後も直前Previewを保持するstale表示
- common FFmpeg error mapping
- Full FFmpeg log
- runtime variant表示
- Cancel後もGraph / Input / 直前Previewを保持
- Graph connectorを実DOM port中心座標へ変更し、v0.2.0のSVG viewBox / canvas min-height不一致を修正

Builder v1.9.4 runnerはduration/rangeを公開していないため、3 / 5 / 10秒とstartはv0.3.0時点では**再生確認範囲**であり、FFmpeg変換自体は入力全体へ適用する。この制約はUI / READMEへ明示する。


---

## v0.4.0 実装メモ（2026-09-08）

正式ロードマップの Video Filter Set を実装する。

- Trim / Speed / FPS / Scale / Crop / Pad / Rotate / Flip
- Aspect Ratio / Color Adjust / Hue / Blur / Sharpen / Fade
- 各nodeのHuman-readable UI / Help / Validation / Advanced filter expression
- Graph compilerとBrowser runner `videoFilter` compilerの共通化
- Builder v1.9.7 runtime manifestのfilter catalog / timeRangeRender capabilityを使ったPreview可否判定
- runtime未対応nodeを意味の異なるfilterへ置き換えず、UI上で明示的に無効化
- Graph connector座標をtransform後の実DOM port中心へ変更
- favicon / 左上ブランドアイコンへGraph + Filterファネル要素を追加

Builder v1.9.5でvideo `trim` とbounded time-range renderが利用可能になり、v1.9.7でrange終了時のEOF処理とfilter出力dimension保持が修正されたため、Trimのcompiler / validation / Desktop command / Browser Previewをすべて有効化する。Preview cache keyにはGraphだけでなくstart / durationも含める。


---

## v0.5.0 実装メモ（2026-09-09）

正式ロードマップの Complex Filtergraph の中核として、**1つのメイン動画内での分岐・合流**を実装する。

実装済み：

- Split node（A / Bの2出力port）
- Overlay node（MAIN / OVERの2入力port）
- Edge `fromPort` / `toPort`
- Graph schemaVersion 2
- branch / mergeを含むDAG validation
- Splitの両branch、Overlayの両inputに対する必須接続validation
- branch label compiler
- Desktop `filter_complex` complex mapping
- Builder v1.9.7向けcomplex `videoFilter` compiler
- Picture in Picture相当（片branchをScaleしてOverlay）
- Overlay X / Yとposition preset
- branchを考慮したPreview source horizon伝播
- Split + Blur / Scale + Overlay regression graph
- ST / MT共通Graph compiler

Builder v1.9.7のFilter Builder profileには `split` / `overlay` が既に含まれるため、この中核実装のためのruntime更新は不要。Browser runnerは外側に1つのbuffer source / sinkを持つため、Browser用 `videoFilter` は外部input/outputだけlabelを付けず、内部branchのみlabelを生成する。

一方、仕様書v0.5.0項目のうち **Multiple input files / Image input / ファイルWatermark** は、Builder v1.9.7 runnerが1つのmain input contextしか公開していないため、Browser Preview対応済みとはしない。意味の異なる代替実装でごまかさず、追加inputを明示的に渡せるmulti-input runtime contractを用意してから実装する。

---

## v0.6.0 実装メモ（2026-09-09）

実装済み：

- Graph schema v3
- Video / Audio typed ports
- Audio portはひし形、Audio edgeは破線として色だけに依存しない表示
- Audio Trim / Volume / Fade / Speed / High-pass / Low-pass / Normalize
- Audio Split / Audio Mix
- Audio Mix input A / Bの個別volume
- `videoFilter` / `audioFilter` の個別Browser runner request
- Desktop向けVideo / Audio統合 `filter_complex`
- Video SpeedのAudio同期（既定ON、OFF可能）
- 0.25x〜4xのAudio Speedを複数 `atempo` へ自動chain
- Audio Mix sample graph

Builderはv1.9.7を継続利用する。必要な `atrim` / `asetpts` / `volume` / `afade` / `atempo` / `highpass` / `lowpass` / `loudnorm` / `amix` / `asplit` / `aresample` は既にprofileへ含まれる。

現時点の制約：

- Audio Mixは同一InputのAudioをAudio Splitで分岐してmixする。複数外部Audio fileは未対応。
- NormalizeはPreview向けone-pass `loudnorm`。測定値を使うtwo-pass normalizeは将来対応。
- Draw Textはv0.6.0から分離し、次milestoneへ送る。


---

## v0.7.0 実装メモ（2026-09-09）

Text / Draw Text milestoneとして以下を実装する。

- Video 1-input / 1-outputのDraw Text node
- text / font size / text color
- top-left / top-center / top-right / center / bottom-left / bottom-center / bottom-right / custom X/Y
- background on/off / color / opacity / padding
- start time / end time
- Builder v1.9.8 `drawtext` + FreeType + HarfBuzz
- Browser Previewではユーザー文字列をvirtual `textfile`へ渡し、filter expressionへ直接埋め込まない
- Desktop commandではcopy可能な単一commandを維持するためescaped `text=`を生成
- `expansion=none`で通常のユーザー文字をFFmpeg expansion syntaxとして扱わない
- Draw Textをtimeline-sensitive nodeとして扱い、非ゼロPreview startでも表示時刻の意味を維持
- M PLUS 1p Regularを標準フォントとして日本語 / 英語を描画

標準フォントはソースZIPへバイナリ同梱しない。`font.lock.json`でGoogle Fontsのcommit / Git blob SHA-1 / byte sizeを固定し、build時に検証済みfontを取得して完成したsingle HTMLへ埋め込む。したがってアプリ実行時の外部font通信は発生しない。OFL-1.1本文はrepositoryへ含める。

現時点の制約：

- v0.7.0はsingle-line text。改行・control characterは拒否する。
- user font upload / font selectionは将来対応。
- 複数独立media inputは引き続きmulti-input runtime contract待ち。

---

## v0.8.0 実装メモ（2026-09-10）

Recipes / Full Render milestoneとして以下を実装する。

- Recipe selectorと10 Recipe（Resize 720p / Square Crop / Vertical Video / Rotate / Fade / Watermark / Picture in Picture / Blur Background / 2x Speed / Audio Normalize）
- Recipeは専用executorではなくGraph schemaVersion 3の実ノード・Edgeへ展開する
- Recipe生成後も通常のGraph編集、validation、Desktop command、Browser Previewを継続利用できる
- Previewと同じcompiled requestからrange指定だけを外し、動画全体へ同じVideo / Audio filter graphを適用するFull Render
- H.264 + AAC MP4の生成、出力ファイル名指定、実ファイルサイズ表示、明示的な保存
- Graph JSONの保存 / 読み込み
- localStorageへのGraph自動保存と前回セッション復元。動画File・動画bytes・render結果は保存しない
- ST / MTで同じRecipe・Graph・Full Render機能を提供する
- RuntimeはFFmpeg WASM Builder v1.9.8を継続利用する

### Multiple Input境界

Builder v1.9.8のFilter Builder runnerは引き続き1つのmain media inputを扱う。v0.8.0ではこの制約を隠さない。

- Watermark RecipeはDraw Textによる文字ウォーターマークとする
- Picture in Picture Recipeは同一InputをSplitして作るbranch合成とする
- 独立した画像Watermark、2本目の動画を使うPiP、複数独立media inputは将来のmulti-input runtime contractへ送る

Recipeの説明・README・Helpでもこの境界を明記し、未対応機能を対応済みとして扱わない。
---

## v0.9.0 実装メモ（2026-09-10）

Release Candidate / 回帰・堅牢性 milestone。v0.8.0までのGraph schemaVersion 3、Preview、Full Render、ST / MT、Draw Text、Graph JSON / Autosaveの契約を変更しない。

UI整理として左側Filter paletteを以下の折りたたみグループへ変更する。

- Video filters
- Text
- Complex graph
- Audio filters
- Graph操作 / Graph tools

各グループはnative `details` / `summary`を使い、初期状態は閉じる。これによりFilter一覧がGraph Canvasより大幅に縦長になる状態を避ける。

従来の `Graph` グループはfilterではなく、以下の編集補助操作をまとめたものなので `Graph操作 / Graph tools` へ改名する。

- Undo
- Redo
- Split + Overlay sample
- Audio Mix sample
- Reset

v0.9.0では新しいFFmpeg filterやGraph schema変更を主目的にせず、既存機能の回帰、異常系、ST / MT、単一HTML、スマートフォンUIを優先して確認する。

## v1.0.0 実装メモ（2026-09-11）

v0.9.0で確定したGraph schemaVersion 3、Preview、Full Render、ST / MT、Draw Text、Graph JSON / Autosaveの挙動を維持したまま正式版へ移行する。

正式版仕上げでは以下を行う。

- app / build / runtime User-Agent / testのversionを1.0.0へ統一
- Release Candidate専用文言を利用者向けUI / READMEから削除
- READMEを実際のv1.0.0機能・制約・Browser supportへ同期
- favicon / 左上ブランドアイコンを指定済みSVGへ統一
- deploy workflowでもAudio / Text / Recipes / i18n / release smoke testを実行
- `tests/release-candidate-smoke.mjs` を `tests/release-smoke.mjs` へ整理
- APP_SPECの古いMultiple Input前提を現在の1 main MP4 input仕様へ修正
- template由来で本アプリに不要な `htmlapps-template.zip`、WebRTC QR pairing部品 / docs、未使用UI component、未使用npm dependency管理一式、`README-FIRST.txt` をrepositoryから削除

Multiple Inputはv1.0.0の完成条件へ含めない。WatermarkはDraw Text、Picture in Pictureは同一InputのSplit branchという現在の境界を正式仕様とする。
---

# v1.1.0 — Graph Workspace Redesign

## 目的

Graph Canvasをアプリの主役にし、v1.0.0のGraph schema v3 / Compiler / Preview / Full Render / ST / MTを維持したまま、Node Editorとしての操作性を段階的に刷新する。

## 開発計画

1. **alpha.1 — Workspace Core**: Node-RED型の左右開閉サイドバー + 中央Canvas、Pan / Zoom、100%、Fit、viewport state、v1.0.0 Graph JSON互換。
2. **alpha.2 — Modern Node UI**: 約200px Node、header/icon/category、parameter summary、Port表示刷新。
3. **alpha.3 — Manual Layout / Selection**: Node drag、位置保存、複数選択、marquee、Edge選択、Undo / Redo。
4. **beta.1 — Palette / Inspector Polish**: Filter検索、Sidebarの表示状態・操作性調整、Graph toolbar集約。
5. **beta.2 — Connection UX / MiniMap**: alpha.3で先行実装したdrag-to-connect / 接続候補強調を磨き込み、Edge hoverとMiniMapを追加。
6. **beta.3 — Mobile**: Full-width Canvas、Bottom Sheet、Touch pan / pinch zoom / connection。
7. **rc.1 — Regression**: v1.0.0機能・Graph JSON・ST / MT・file://・CSP・完全ローカル処理の全体回帰。

## v1.1.0-alpha.1 実装メモ（2026-09-11）

- 3カラムの中央にあったGraph Canvasを、editor内の先頭・全幅へ移動。Filter / Inspectorは後段の補助領域とした。
- Desktop Graph viewportを `clamp(560px, 68vh, 820px)`、Mobileを `clamp(420px, 62vh, 620px)` とした。
- Mouse wheel / trackpad zoom、Canvas background drag / middle mouse / Space+drag pan、Fit、100%、+ / - を追加。
- Zoom範囲は40%〜200%。
- dot gridはviewportのPan / Zoomに追従する。
- Graph JSON envelopeへoptionalな `workspace.viewport` を追加。Graph schemaVersion 3には変更なし。
- v1.0.0のGraph JSONはworkspace情報がなくてもそのまま読み込み、初回表示時に自動Fitする。
- Autosaveにもviewportを保存するが、動画・Preview・Full Render結果は従来どおり保存しない。
- `stableGraphPayload()` はworkspaceを参照しないため、Pan / ZoomではGraph HashもPreview stale状態も変化しない。
- Recipe適用 / Sample Graph / Resetでは新Graphを自動Fitする。
- Nodeの手動配置、新Node UI、MiniMapはalpha.1の対象外。
- 実機レビューを受け、Filter / Graph / Inspectorの配置はNode-RED型の左右サイドバー構成へ前倒しで変更。左右は独立して開閉でき、閉じた分だけGraph Canvasを広げる。
- 拡大時の文字・線のぼやけを抑えるため、対応ブラウザではGraph本体の拡大にCSS `zoom`を使用し、Pan用translateとZoom用layerを分離する。非対応環境ではtransform scaleへfallbackする。
## v1.1.0-alpha.2 実装メモ（2026-09-11）

- Filter / Graph / Inspectorを別々のカードとして離して見せる構造をやめ、1つのGraph Workspace surface内で隙間なく接続する。
- 左Filterと右InspectorはNode-RED型のサイドバーとして開閉可能なまま維持し、閉じた領域は中央Graph Canvasへ返す。
- Graph / Filter / InspectorだけでなくPreview / Full Renderも含め、線形工程を示していた番号バッジを撤去する。
- Node幅を約210pxへ拡大し、`header + SVG icon + category + readable summary + ports` の構造へ刷新する。
- CategoryはVideo / Audio / Text / Branch / Input / Outputを文字とiconで示し、色だけに依存しない。
- Node summaryはraw FFmpeg式ではなく、Scaleなら `1280 × auto`、Volumeなら `-3 dB` のように主要設定をGraph上で読める表現とする。
- Portの実ヒット領域を36pxへ拡大し、Video circle / Audio diamondの識別は維持する。
- Nodeが広くなった分、auto layoutの列間隔 / 行間隔 / Canvas boundsを拡張する。
- alpha.2ではNode drag / manual positions / marquee / Edge selectionはまだ入れない。これらはalpha.3で実装する。
- Graph schemaVersion 3、Graph Hash、Compiler、Preview、Full Render、ST / MT runtime contractには変更を加えない。
- Graph CanvasにはブラウザFullscreenではないページ内の拡大表示を追加し、通常 `clamp(560px, 68vh, 820px)` から拡大時 `clamp(720px, 82vh, 1040px)` へ切り替える。左右サイドバーと現在viewportは維持する。
- 全Nodeを固定高さ146pxの共通geometryへ揃え、Port位置はNode高さに対する百分率ではなく共通pixel rowへ変更する。Input / Output / Split / Overlay / Audio Mixを含むmulti-port Nodeも同じ基準線で配置する。
- Port row統一に合わせてauto layoutの行間隔 / 列間隔を再調整し、Node種類によるcaption / portの縦ズレを防ぐ。


## v1.1.0-alpha.3 実装メモ（2026-09-11）

- Graph Workspace拡大は高さ変更ではなく、ページ上に浮かぶ非Fullscreenの固定オーバーレイへ変更。
- Node位置を `workspace.positions` としてGraph semanticsから分離し、Graph JSON / Autosaveへ保存。
- Node drag、Ctrl/Cmd+Clickによる個別複数選択、Shift+Clickによる接続コンポーネント一括選択、Shift+Drag矩形選択、複数Node同時移動を追加。
- 出力Portから入力Portへwireをドラッグして接続できるNode-RED型のdrag-to-connectを追加。ドラッグ中はBezier wireを追従表示し、型・Cycle条件を満たす接続可能Portだけを強調する。click-to-connectも補助操作として維持する。
- drag-to-connect中は有効な入力Portの約48px以内（touchは約64px）へ入るとwire終端をPort中心へ吸着し、Portを拡大・発光してマグネット感を示す。吸着状態でreleaseすると接続を確定する。
- Graph Workspaceの浮上表示は四隅拡大型iconを使い、暗転した外側領域のクリックまたはEscで閉じる。
- Edgeを選択可能にし、Delete / Backspaceで削除。Undo / Redo対象。
- Node位置変更だけではGraph Hashを変えず、Previewをstaleにしない。


## v1.1.0-beta.2 実装メモ（2026-09-12）

- Port dragを双方向化し、出力→入力だけでなく入力→出力の逆方向からもwireを作成できるようにする。
- 逆方向dragでもVideo / Audio型チェック、self connection拒否、Cycle検出、既存edge置換、magnetic snapを同じ規則で適用する。
- Edgeのhover hit areaを拡大し、hover / selected / 選択Node接続Edgeの視覚フィードバックを整理する。
- PCのGraph Canvas右下へMiniMapを追加し、Node配置と現在Viewportを表示する。MiniMap click / dragで表示位置を移動できる。
- MiniMapはToolbarから表示 / 非表示を切り替え可能とし、スマートフォンではCanvas領域を優先して非表示にする。
- Fit / Pan / Zoom / Floating Workspace / Palette / Inspectorはbeta.1までの挙動を維持する。
- Graph schemaVersion 3、Graph Hash、Compiler、Preview / Full Render、ST / MT、workspace.positionsには変更を加えない。


## v1.1.0-beta.3 実装メモ（2026-09-12）

Mobileフェーズとして以下を実装。

- 700px以下ではGraph Canvasを横幅いっぱいに優先表示
- Filter Palette / Node InspectorをBottom Sheet化
- Bottom Sheetは同時に1枚だけ開き、背景タップ / Escで閉じる
- safe-areaを考慮したBottom Sheet内部スクロール
- Graph Toolbarを横スクロール可能な1列構成へ変更
- Graph toolbar / sidebar close / Inspector form / PortのTouch targetを44px以上へ拡大
- MiniMapはスマートフォンでは非表示
- Canvasは1本指dragでPan、NodeはTouch dragで移動
- 2本指PinchでZoom + Pan
- PortはDrag接続に加えてTap → Tapでも双方向接続可能
- Video / Audio型チェック、Cycle検出、Magnet snapはTouchでも共通
- DesktopのPalette / Inspector / MiniMap / Pan / Zoom操作は維持
- Graph schema v3 / Compiler / Preview / Full Renderは変更しない


## v1.1.0-rc.1 実装メモ（2026-09-13）

Release Candidateフェーズとして機能追加を凍結し、v1.1.0正式版へ向けた全体回帰へ移行する。

- app / build scripts / runtime User-Agent / repository check / smoke testのversionを `1.1.0-rc.1` へ統一
- Graph schemaVersion 3を維持し、v1.0.0 Graph JSONの `workspace` 未定義データをそのまま読み込めることを回帰契約へ追加
- `workspace.positions` / `workspace.viewport` はGraph semanticsから分離し、Node配置やPan / ZoomだけではGraph HashとPreview stale状態を変更しない契約を維持
- Palette / Inspector、Floating Workspace、Manual Layout、Ctrl/Cmd複数選択、Shift接続Node選択、矩形選択、Edge選択、双方向drag-to-connect、Magnet snap、MiniMap、Mobile Bottom Sheet / Pinch ZoomをRC回帰対象へ固定
- Preview / Full Render、10 Recipe、Video / Audio / Text / Complex Graph、Graph JSON / Autosave、ST / MT、`file://` ST、COOP / COEP MT、CSP `connect-src 'none'`、M PLUS 1p埋め込みをRelease Gateとして再確認
- `tests/release-candidate-smoke.mjs` を追加し、pull request buildとGitHub Pages deployの双方でRC契約を検査
- FFmpeg WASM Builderはv1.9.8のまま固定し、RCでは新filter・Multiple Input・Graph schema変更を入れない

### RC実機Gate

1. PC: Palette / Canvas / Inspector、Floating Workspace、Pan / Zoom / Fit、MiniMap、Node drag / selection / wiring
2. Mobile: Bottom Sheet、1本指Pan / Node drag、Pinch Zoom、Tap / Drag Port接続、横スクロールなし
3. ST: `file://` で Recipe → Preview → Full Render → 保存
4. MT: cross-origin isolation下で同じGraphの Preview → Full Render
5. v1.0.0 Graph JSON読込、Graph JSON保存 / 再読込、Autosave復元
6. Draw Text日本語 / 英語、Audio chain、Split / Overlay、Video Speed + Audio同期
7. 実行時外部通信なし、CSP、standalone / self-extract、favicon / license / README確認


## v1.1.0 正式版 実装メモ（2026-09-13）

v1.1.0-rc.1の実機調整を反映し、Graph Workspace Redesignを正式版として確定する。新しいFFmpeg filter、Multiple Input、Graph schema変更は追加しない。

- app / build scripts / runtime User-Agent / repository check / smoke testのversionを `1.1.0` へ統一
- `tests/release-candidate-smoke.mjs` を `tests/release-smoke.mjs` へ切り替え、PR build / GitHub Pages deployの双方で正式版契約を検査
- README / README.ja.mdからRelease Candidate表記を削除し、v1.1.0のGraph Workspace / Mobile / ST / MT / Multiple Input境界を正式仕様として記載
- Graph Canvasを中心に、左右開閉Palette / Inspector、Floating Workspace、Pan / Zoom / Fit、MiniMap、Modern Node UI、Manual Layout、複数選択、Edge操作、双方向Wiring、Magnet snapを正式機能とする
- Palette検索、Recipe / Graph操作のToolbar統合、Graph初期化確認、Inspector非表示時のNodeダブルクリック再表示を正式仕様とする
- MobileではPalette / Inspector Bottom Sheet、1本指Pan / Node drag、Pinch Zoom、Tap / Drag接続、safe-area、横スクロール防止を正式仕様とする
- Previewの全体表示、Zoom segmented control、Floating Workspace中のToast表示、Audio palette色、sidebar reopen controlをRC実機レビュー反映として確定
- Graph schemaVersion 3、FFmpeg WASM Builder v1.9.8、1 main MP4 input、ST / MT runtime contract、Draw Text font pinを維持
- GitHub Pagesは `/` にST、`/mt/` にMTを配信する。`pages-dist/mt/index.html` のみ、`crossOriginIsolated === false` の場合に固定済み `coi-serviceworker 0.1.7` を同一originから読み込む
- Browser Kitty / Azure Static Web AppsでMT HTMLを取り込んでroute-specific COOP / COEP headerを付ける場合、Azure側ですでにcross-origin isolationが成立するためPages fallback workerは読み込まれない

### v1.1.0 Release Gate

1. `build-standalone.bat` でST / MT通常版・self-extract版が生成できる
2. ST `file://` で動画読込 → Recipe / Graph編集 → Preview → Full Render → 保存が完了する
3. MTで `crossOriginIsolated === true` の環境から同じGraphのPreview / Full Renderが完了する
4. v1.0.0 Graph JSONを読み込め、workspace metadataなしでも自動配置 / Fitされる
5. Node移動・Pan・ZoomだけではGraph Hash / Preview stale状態が変わらない
6. PCでPalette / Inspector / Floating Workspace / MiniMap / Wiring / Selectionが操作できる
7. MobileでBottom Sheet / Pan / Node drag / Pinch Zoom / Tap・Drag接続が操作でき、ページ横スクロールがない
8. Scale / Speed + Audio sync / Trim / Split / Overlay / Audio filters / Draw Text / 10 Recipesが回帰しない
9. Graph JSON / Autosaveはmedia bytesを保存しない
10. runtime CSP `connect-src 'none'`、外部runtime依存なし、favicon / license / READMEが正式版と一致する

# v1.2.0 — Multiple Input

## v1.2.0-alpha.1 実装メモ（2026-09-18）

Multiple Input実装の第1段階として、UIやFFmpeg複数入力実行より先にGraph / Projectのデータモデルを更新する。

- Graph schemaを **schemaVersion 4** へ更新する。
- Graph top-levelへ `mainInputId` を追加し、複数Input Nodeのうち処理基準となるInputを明示できる構造にする。
- Input Nodeへoptionalな `source` metadataを追加する。保存対象は `kind` / `name` / `size` / `lastModified` / `mimeType` / `durationSeconds` / `width` / `height` とし、ローカルpath、Blob、File本体は保存しない。
- browser `File` objectはGraphとは分離したruntime-only `inputBindings` で保持する。Graph JSON / Autosaveへmedia bytesを混入させない。
- v1.0 / v1.1で保存されたschemaVersion 3 Graphは読み込み時にschemaVersion 4へ自動migrationする。最初のInput Nodeを `mainInputId` とし、既存Node / Edge / workspace metadataは保持する。
- schemaVersion 4のProject Data Modelは複数Input Nodeを表現・保存・再読込できる。ただしalpha.1ではFFmpeg Compiler / Preview / Full Renderの実行経路は従来の1 main inputに限定し、複数Input Graphは実行不可として明示する。
- Graph Hashには `mainInputId` を含める一方、ファイル名やサイズなどのsource metadataは含めない。実ファイル差し替えによるPreview cache無効化はruntime file token側で扱う。
- RecipeでGraphを再生成した場合も、現在のmain Input source metadataを引き継ぐ。
- Graph JSONを開いた場合、保存済みsource metadataは残すがbrowser `File` bindingは復元できないためruntime bindingを解除し、再選択を前提とする。
- FFmpeg WASM Builder v1.9.8、ST / MT、`file://` ST、GitHub Pages `/mt/`、CSP `connect-src 'none'`、Draw Text、Graph Workspace v1.1.0の操作契約は変更しない。

### alpha.1 Gate

1. 新規Graph / Recipe GraphがschemaVersion 4 + `mainInputId`で生成される。
2. schemaVersion 3 Graph JSONが非破壊でv4へmigrationされる。
3. v4 Graph JSONで複数Input Nodeとmain Inputを保持できる。
4. Input source metadataへローカルpathやFile bytesを保存しない。
5. Graph JSON / Autosave読込後はruntime File bindingを引き継がない。
6. source metadata変更だけではGraph Hashを変えず、`mainInputId`変更はGraph semanticsとしてHashへ反映する。
7. 既存Scale / Speed / Trim / Split / Overlay / Audio / Draw Text / Recipe / Preview / Full Render回帰がない。
8. ST / MT build、GitHub Pages ST / MT配信、runtime cache repairを維持する。

## v1.2.0-alpha.2 実装メモ（2026-09-18）

Multiple Input実装の第2段階として、alpha.1のschemaVersion 4をCanvas / Palette / Inspectorの実操作へ接続する。FFmpeg複数入力実行はまだ有効化しない。

- Palette最上部へ **Input** categoryを追加し、Video / Audio / Imageを個別のInput Nodeとして追加できるようにする。現段階のVideo Inputは既存runtime契約に合わせMP4を選択対象とする。
- 初期状態の空Video Inputは最初のVideo追加時だけ再利用する。Audio / Image追加時は既存Video Inputを別種類へ暗黙変換せず、独立したInput Nodeを作成する。
- Input Nodeはsource kindに応じてportを動的にする。VideoはVideo + Audio、AudioはAudioのみ、ImageはVideo系portのみを表示する。Validation / connection UIも固定 `NODE_DEFS.input.outputPorts` ではなく動的portを参照する。
- Canvas上ではInput種別に応じたicon / title / filename summaryを表示し、現在の `mainInputId` には `MAIN` badgeを表示する。
- InspectorでInputごとのファイル名、解像度またはduration、sizeを表示し、ファイル変更 / ファイル解除 / メイン素材に設定を提供する。Graph JSON復元後にsource metadataだけ残っている場合は「ファイル未選択」を明示する。
- ファイル解除後もInputのmedia kindは保持し、同じ種類のファイルを再選択できるようにする。
- 追加Inputは削除可能とする。最後のInputは削除不可。Main Inputを削除した場合は残ったInputをMainへ昇格する。削除・差し替え・解除・Main切替は既存Undo / Redoへ統合する。
- Runtime File bindingは引き続きGraph外の `inputBindings` で保持し、current-session Undo / Redo snapshotにもFile referenceを保持する。Graph JSON / AutosaveにはFile本体を保存しない。
- Graph semanticsでは `mainInputId` に加えてInput media kindをHashへ含める。filename / size / lastModifiedなどのsource metadataはHashへ含めない。
- 複数Inputを含むGraphのPreview / Full Renderは引き続き明示的にblockする。alpha.2ではUIだけ先行し、alpha.4 / alpha.5のCompiler / Runtime実装前に1素材だけを誤実行しない。
- Mobileはv1.1.0のPalette / Inspector Bottom Sheetをそのまま利用し、Input追加・差し替え・Main切替をPCと同じ機能で提供する。

### alpha.2 Gate

1. PaletteからVideo / Audio / Image Inputを追加できる。
2. Input種別に応じて利用可能portだけがCanvasへ表示される。
3. Inspectorからファイル差し替え・解除ができ、解除後もInput種別が維持される。
4. Main Inputを切り替えると`mainInputId`とCanvasの`MAIN`表示が更新され、legacy single-input Preview stateもMainへ追従する。
5. Extra Inputを削除でき、最後のInputは削除できない。Main削除時は別InputがMainになる。
6. Add / Replace / Remove / Delete / Main切替がUndo / Redoと競合しない。
7. Graph JSON / Autosaveへlocal path / File / media bytesを保存しない。
8. schemaVersion 3 → 4 migration、既存v1.1 Graph Workspace、ST / MT、CSP、Preview / Full Renderのsingle-input回帰を維持する。
9. 複数Input GraphをPreview / Full Renderしようとしても、後続実装まで明示的にblockされる。



## v1.2.0-alpha.3 実装メモ（2026-09-18）

Multiple Input実装の第3段階として、Canvas DropとMissing Input状態を追加する。FFmpeg複数入力実行は引き続き後続phaseで有効化する。

- Graph CanvasへOSからファイルを直接Dropできる。対応対象は現段階のVideo InputであるMP4、Audio Inputで扱う音声、Image Inputで扱う画像とする。
- 複数ファイルを同時Dropした場合、対応ファイルごとに独立したInput Nodeを生成し、Drop位置を起点に重ならないよう配置する。未対応ファイルは無視せず、スキップした件数をToastで知らせる。
- 空の初期Video Inputがある場合、最初のVideo DropではそのNodeを再利用する。不要なInput Node増加を避ける。
- browser `File` bindingがないInputへ1ファイルをDropした場合、media kindが一致すれば既存Inputへbindして再利用する。kind不一致なら暗黙変換せず、種類が合わないことを通知する。
- Graph JSON / Autosave復元後、`source.name`など保存済みmetadataはあるがbrowser `File` bindingがないInputを **Missing Input** として扱う。Canvasでは穏やかな要再選択表示、Inspectorでは元ファイルを選び直す案内を表示する。
- Graph JSON import / Autosave recovery後は、Missing Input数をToastで知らせる。File本体・Blob・ローカルpathを保存しない境界は維持する。
- Canvas Dropの視覚overlayはGraph navigation / MiniMap / Node drag / Wiringより上に表示するがpointer eventは奪わない。Drop終了時には必ず解除する。
- Input File bindingの追加・再関連付けは既存Undo / Redo、Graph Hash、Preview stale処理と競合しない。
- 複数Input GraphのPreview / Full Renderはalpha.4 / alpha.5まで引き続き明示的にblockする。

### alpha.3 Gate

1. Canvasへ1ファイルをDropして対応Inputを追加できる。
2. 複数ファイルDropで複数Inputを生成でき、unsupported fileを明示的にskipできる。
3. Drop位置を基準にInput Nodeが配置され、既存Graph操作と競合しない。
4. Missing InputがCanvas / Inspectorの両方で明確に分かる。
5. 未bind Inputへ対応ファイルをDropするとそのInputを再利用できる。
6. Graph JSON / Autosave復元後もsource metadataは残るがFile object / bytes / local pathは復元・保存されない。
7. Graph JSON / Autosave復元時にMissing Input数を案内できる。
8. schemaVersion 3→4 migration、Main Input、Palette / Inspector、Mobile、ST / MT、GitHub Pages `/mt/`を回帰させない。
9. 複数Input FFmpeg実行はまだ有効化せず、誤ってMain Inputだけを処理しない。

## v1.2.0-alpha.5 実装メモ（2026-09-18）

Multiple Input実装の第4段階として、schemaVersion 4の複数Input Graphを実際のFFmpeg input index / stream label / filter_complexへ落とすCompilerを実装する。Browser Preview / Full Renderへの接続はalpha.5へ分離する。

- `resolveInputs()` をCompilerと次phase Runtimeの共通契約として追加する。Input NodeはGraph `nodes[]`内の順序でFFmpeg indexを持ち、`mainInputId`を変更してもindexを並べ替えない。
- 各Inputを `/workerfs/input-N.ext` の安定したruntime virtual pathへ解決する。Videoは`N:v` + `N:a`、Audioは`N:a`、Imageは`N:v`として扱う。
- Image Inputは静止画をOverlay等へ供給できるようcompiler input optionとして `-loop 1` を持つ。
- Graph validationはInput Nodeが複数あるだけではerrorにしない。すべてのNodeが「いずれかのInputから到達可能」かつ「単一Outputへ到達可能」であることを要求し、unused Input / disconnected branchは引き続きinvalidとする。
- `compileGraph()` は全Input stream labelをseedし、異なるInput由来のstreamをOverlay / Audio Mixなどで同じDAG内に合流できるようにする。
- Desktop FFmpeg commandは複数 `-i` + 1つの `-filter_complex` + explicit `-map` を生成する。raw stream pass-throughの場合も対象Input indexを正しくmapする。
- Browser requestは1 Input GraphではBuilder v1.9.8互換の `input` / `videoFilter` / `audioFilter` を維持する。複数Input Graphでは `mode: multi-input`、`inputs[]`、`filterComplex`、`videoMap`、`audioMap` を生成する。
- Graph IRへ `inputs[]` と各Inputのindex / kind / Video stream / Audio streamを追加する。legacy用途の `input` fieldはMain Input descriptorとして維持する。
- Video Speedのimplicit Audio syncはMain InputのAudioだけを対象とし、独立Audio Inputを暗黙にretimeしない。
- alpha.4では複数Input GraphのPreview / Full Renderボタンを明示的に無効化する。Compiler contractだけ先に完成させ、alpha.5でbrowser `File` mountとFFmpeg argv生成へ接続する。
- 既存1 Input GraphのDesktop command / Browser `videoFilter` / `audioFilter`、ST / MT、Draw Text、Recipe、Graph JSON、Autosave、Canvas Dropを回帰させない。

### alpha.4 Gate

1. Video + Image Overlay Graphが複数`-i`と`[0:v]` / `[1:v]`を含む`filter_complex`へcompileできる。
2. 2つのAudio InputをAudio Mixへ接続したGraphが異なる`N:a` streamを正しく参照できる。
3. Image Inputに`-loop 1`が付く。
4. `mainInputId`を切り替えてもFFmpeg input indexが変わらない。
5. multi-input Browser requestに`inputs[]` / `filterComplex` / `videoMap` / `audioMap`が入る。
6. 1 Input Graphは従来のBuilder v1.9.8 Browser requestとcompile結果を維持する。
7. 複数Input Graphはvalidation可能だがPreview / Full Renderはalpha.5まで実行されない。
8. schemaVersion 3→4 migration、Missing Input、Canvas Drop、Mobile、GitHub Pages ST / MT、CSP、runtime cache repairを維持する。


## v1.2.0-alpha.5 runtime integration

Multiple Input Preview / Full Render uses the same compiled `filterComplex` contract as desktop command generation. Each Input binding is mounted into WORKERFS at its stable virtual path. Execution is enabled only when the embedded runtime manifest advertises both `multipleInputs: true` and `complexGraph: true`; the v1.9.8 single-input runtime remains valid for one-input graphs.

## v1.2.0-beta.2 Two-video Picture in Picture（2026-09-20）

v1.2.0-beta.2では、Picture in Picture Recipeを同一InputのSplit構成から、Main Input + 2本目のVideo Inputを使う実Multi-input構成へ変更する。

- Main InputのVideoをOverlayのMAINへ接続する。
- 2本目のVideo InputをScaleし、OverlayのOVERへ接続する。
- AudioはMain InputからOutputへ接続する。beta.1では2本目のAudioを自動mixしない。
- 既存GraphにMain以外のVideo Inputがある場合、Recipe適用時にそのFile bindingを`input-2`へ引き継ぐ。
- 2本目が未選択の場合はMissing Inputとして`input-2`を作成し、そのInputを選択状態にする。
- PiP RecipeのOverlayは`shortest:false`を既定とし、`eof_action=pass:repeatlast=0`で前景終了後もMain Inputを継続する。
- Overlay Inspectorには「短い方で出力を終了」を残し、ユーザーが明示的に`shortest=1`を選べるようにする。
- Preview / Full RenderはBuilder v1.9.9の`multipleInputs:true` / `complexGraph:true` runtimeを前提とする。

### Builder v1.9.9 release handoff

beta.1のrelease pathでは、開発用のローカルBuilder参照を最終形にしない。Builder v1.9.9をタグ付けしてGitHub Release workflowでST/MT runtime ZIPを公開した後、`scripts/promote-builder-v1.9.9.ps1`でRelease assetを取得し、SHA-256を計算して`runtime.lock.json`へ固定する。

アプリの完成HTMLはFFmpeg runtimeを内部に埋め込むため、GitHubはbuild-timeの取得元であり、実行時ネットワーク依存にはしない。

## v1.2.0-beta.2 Image Input / Logo Overlay（2026-09-20）

- Image Inputを実行機能として有効化し、現在のreviewed runtimeで確実に扱う対象をPNG / JPEGに限定する。
- Logo Overlay Recipeは Main Video + Image Input + Scale + Overlay + Main Audio のGraphへ展開する。
- Image Inputが未選択の場合はMissing Inputとして作成し、選択状態にして次の操作を明確にする。既存のImage Input bindingがある場合は引き継ぐ。
- Logo用途ではOverlayを`shortest=0:eof_action=repeat:repeatlast=1`として静止画をMain Inputの最後まで維持する。
- 2動画PiPはbeta.1の`shortest=0:eof_action=pass:repeatlast=0`を維持し、短い前景動画の最終frameを固めない。
- Overlay Inspectorから「前景の表示を維持」を切り替え可能にする。
- runtime.lock.jsonは公開済みFFmpeg WASM Builder v1.9.9 ST / MT GitHub Releaseへ固定する。GitHubアクセスはbuild時のみで、standalone実行時はruntimeを内包して外部通信しない。


## v1.2.0-beta.3 Audio Input / BGM / Audio Mix（2026-09-21）

- Audio Inputを外部BGM / 置き換え音声としてPreview / Full Renderまで利用できるようにする。
- Recipeに「BGMを追加」「音声をBGMに置き換える」を追加する。
- Main音声 + BGMではBGMを既定-12 dBとし、Audio Mix前に各入力へ`aresample=48000,asetpts=PTS-STARTPTS`を適用する。
- Audio Mixは`durationMode`を持ち、A基準 / shortest / longestを選択できる。BGM RecipeではlongestでMixしてからMain動画durationで切る。
- Main動画が無音の場合は存在しない`[0:a]`を生成せず、外部Audioだけを出力へ接続する。
- BGM / 置き換え音声はMain動画durationで`atrim`し、長い音声素材が動画durationを延ばさないようにする。短いBGMは無理にloopせず、終了後はMain音声のみ（無音Mainなら音声なし区間）とする。
- Audio InputのFile body/pathはGraph JSON / Autosaveへ保存せず、既存のruntime-only binding境界を維持する。対応形式はMP3 / WAV / M4A / FLAC / OGG / Opusに限定し、raw `.aac`はUIで受け付けない。
- Builder v1.9.9の既存`amix` / `aresample` / `asetpts` / `volume` / `atrim`を使用し、新しいruntime外部依存は追加しない。

## v1.2.0-beta.4 Graph Restore / Auto Relink（2026-09-21）

- Graph JSON / Autosaveから復元したInputは、source metadataを保持しつつFile本体を保存しない既存privacy境界を維持する。
- Missing Inputが1件以上ある場合、Graph toolsに **「素材をまとめて再選択」** を表示し、複数ファイルを一度に選択できるようにする。
- Auto Relinkはmedia kindが一致し、filenameが同一で、保存済みsizeがある場合はsizeも同一であることを必須条件とする。`lastModified`とMIME一致は候補の優先度を上げるが、コピー等でtimestampが変わった同一素材を不必要に拒否しない。
- 一致しないファイルを推測で割り当てない。同名でもsizeが異なる場合やmedia kindが異なる場合はMissing Inputのまま残す。
- 同じbrowser sessionでGraph JSONを開き直す場合は、現在のruntime-only `inputBindings` に残るFile objectから一致するものを再利用し、不要な再選択を省く。File objectをlocalStorage / IndexedDB / Graph JSONへ永続化しない。
- Canvasへ複数ファイルをDropした場合はMissing InputへのAuto Relinkを先に行い、一致しなかった対応ファイルだけを新しいInputとして追加する。特定の未bind Inputへ1ファイルをDropする既存操作は維持する。
- 一括relinkは1操作としてUndo履歴・Graph refresh・autosaveと整合させ、Preview / Full Renderは必要なInputがすべてboundになるまで実行しない。
- filename / size / type / lastModified以外のlocal absolute pathは取得・保存しない。fingerprintはbeta.4では導入せず、必要性が確認された場合のみ将来検討する。

### beta.4 Gate

1. 複数Missing Inputへ元ファイルを順不同でまとめて再選択し、正しいInputへ自動relinkできる。
2. filename + sizeが一致しないファイルを誤って自動relinkしない。
3. lastModifiedが変わったコピーでもfilename + size + media kindが一致すれば復元できる。
4. 同一session内では既存runtime File bindingを再利用できる。
5. Canvas DropはMissing Inputを先に復元し、unmatched fileだけを新Inputとして追加する。
6. Graph JSON / AutosaveにFile / Blob / media bytes / absolute pathを保存しない。
7. PiP / Logo / BGM / Audio Mix / Recipe / Preview / Full Render / Undo / Redo / Mobile / ST / MTを回帰させない。

## v1.2.0-rc.1 全体回帰（2026-09-21）

v1.2.0-rc.1では新規機能追加を止め、v1.2.0 Stableへ向けた回帰確認を行う。beta.4までに確定したUI・Graph schema・runtime contract・privacy境界を変更しない。

### rc.1 Gate

1. Single InputのPreview / Full Render / Desktop commandを維持する。
2. 2動画PiP、Image Input / Logo Overlay、Audio Input / BGM / Audio MixがST / MTの共通compiler contractを維持する。
3. 無音Main動画では存在しないAudio streamを参照しない。
4. Graph JSON / Autosave / Auto RelinkでFile body、Blob、絶対パスを永続化しない。
5. 24 Recipe、Draw Text、Trim、Speed、Undo / Redo、Delete、keyboard移動、Palette drag、Canvas file dropを回帰させない。
6. PCではPalette / Inspectorの固定高内部scroll、MobileではBottom Sheet / touch pan / pinch zoomを維持する。
7. 標準ST版は`file://`、MT版はCOOP / COEP付きHTTP(S)という実行条件を維持する。
8. standalone runtimeは`connect-src 'none'`を維持し、CDN / telemetry / user media uploadを追加しない。
9. Builder v1.9.9 release pin、SHA-256 verification、single HTML生成、GitHub Pages ST / MT配置を維持する。
10. JA / EN、README、favicon、screenshot、version表示をrc.1へ同期する。

## v1.2.0 Stable（2026-09-21）

v1.2.0 Stableはv1.2.0-rc.1の機能・runtime contract・privacy境界を変更せず、正式版として確定する。Stable化に伴う新規filter、Graph schema変更、外部依存追加は行わない。

### Stable Gate

1. app / build scripts / runtime User-Agent / repository check / CI / version badgeを `1.2.0` へ統一する。
2. beta.1〜beta.4の専用回帰、24 Recipes、無音動画、Audio Mix、Auto Relink、Mobile、ST / MT、GitHub Pages配置をrelease gateとして維持する。
3. Graph schemaVersion 4とschemaVersion 3 migrationを維持し、Graph JSON / AutosaveへFile body・Blob・絶対pathを保存しない。
4. Builder v1.9.9のST / MT Release assetとSHA-256 pinを変更しない。
5. 標準ST版は`file://`で利用可能、MT版はcross-origin isolation + `SharedArrayBuffer`を前提とする。
6. standalone HTMLは`connect-src 'none'`を維持し、runtime時のCDN / telemetry / user media uploadを追加しない。
7. PC / Mobile、JA / EN、README、favicon、release screenshotをStable状態へ同期する。
8. rc.1からStableへの変更はrelease metadata / docs / gate更新に限定し、ユーザー向け機能挙動を変更しない。

