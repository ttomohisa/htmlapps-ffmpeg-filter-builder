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

JSONを読み込み、

Graphを復元する。

元Input Fileはセキュリティ上自動復元できないため、

**この入力ファイルを選んでください**

と再指定させる。

Filename / size / fingerprintを照合する。

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

候補：

1. 720pへ縮小
2. 正方形にCrop
3. 縦動画へ変換
4. 90度回転
5. Fade In / Out
6. Watermark
7. Picture in Picture
8. 背景ぼかし縦動画
9. 2倍速
10. 音量を整える

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
- GitHub Pagesでも動作
- COOP / COEP不要

`index.mt.html`：

- multi-thread
- HTML自体は完全自己完結
- HTTP(S)配信必須
- COOP / COEP必須
- Browser Kittyの対応ルートで配信

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
- Commandコピー

を可能にすることを目標とする。

ただし複雑Graph編集とRenderはPC推奨。

---

# 82. Touch UI

スマートフォンでは、

右panelをbottom sheet化。

Node Paletteもdrawer化する。

Connection操作はtouch targetを十分大きくする。

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

