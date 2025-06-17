// --- DOM要素の取得 ---
// このセクションでは、HTML内の各要素をJavaScriptで操作するために取得し、定数に格納します。

// アプリケーションの各画面
const uploadView = document.getElementById("upload-view"); // ファイルアップロード画面
const editorView = document.getElementById("editor-view"); // 画像編集画面

// アップロード関連の要素
const dropZone = document.getElementById("drop-zone"); // ドラッグ＆ドロップエリア
const fileInput = document.getElementById("file-input"); // ファイル選択のinput要素
const uploadButton = document.querySelector("#upload-button"); // 「ファイルを選択」ボタン

// Canvasと描画コンテキスト
const canvas = document.getElementById("canvas"); // メインのプレビュー用Canvas
const ctx = canvas.getContext("2d"); // プレビュー用Canvasの2Dコンテキスト

// 設定変更用のUI要素
const bgColorPicker = document.getElementById("bg-color"); // 背景色選択ピッカー
const formatSelector = document.getElementById("format-selector"); // 保存形式選択ラジオボタン

// 操作ボタン
const downloadBtn = document.querySelector("#download-button"); // ダウンロードボタン
const resetBtn = document.querySelector("#reset-button"); // リセットボタン

// 位置調整モーダル関連の要素
const positionEditorModal = document.getElementById("position-editor-modal"); // モーダルウィンドウ全体
const editorCanvas = document.getElementById("editor-canvas"); // モーダル内の拡大Canvas
const editorCtx = editorCanvas.getContext("2d"); // 拡大Canvasの2Dコンテキスト
const adjustPositionBtn = document.getElementById("adjust-position-btn"); // モーダルを開くボタン
const resetPositionBtn = document.getElementById("reset-position-btn"); // 位置・サイズをリセットするボタン
const closeModalBtn = document.getElementById("close-modal-btn"); // モーダルを閉じるボタン
const upBtn = document.getElementById("up-btn"); // 上移動ボタン
const downBtn = document.getElementById("down-btn"); // 下移動ボタン
const leftBtn = document.getElementById("left-btn"); // 左移動ボタン
const rightBtn = document.getElementById("right-btn"); // 右移動ボタン

// --- アプリケーションの状態管理 ---
// このセクションでは、アプリケーション全体で利用する変数（状態）を定義します。

let uploadedImage = null; // アップロードされた画像(Imageオブジェクト)を保持する変数
let originalFilename = ""; // 元のファイル名（拡張子なし）を保持する変数
let logoSize = 72; // ロゴのサイズ (初期値 72px)
let bgColor = "#FFFFFF"; // 背景色 (初期値 白)
let imageFormat = "jpg"; // 保存形式 (初期値 jpg)

// 位置調整・拡縮のための状態変数
let logoX = 0,
  logoY = 0; // ロゴの描画位置 (左上隅のx, y座標)
let isDragging = false; // モーダル内でドラッグ中かどうかのフラグ
let dragStartX = 0,
  dragStartY = 0; // ドラッグ開始時のマウス座標

// --- イベントリスナーの設定 ---
// このセクションでは、ユーザーの操作（クリック、ドラッグなど）に応じて特定の処理を実行するための設定を行います。

// 「ファイルを選択」ボタンをクリックしたら、非表示のfileInputをクリックさせる
uploadButton.addEventListener("click", () => fileInput.click());
// ファイルが選択されたらhandleFile関数を実行
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// ドラッグ＆ドロップのイベント設定
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault(); // デフォルトの動作（ファイルを開くなど）をキャンセル
  dropZone.classList.add("drag-over"); // drag-overクラスを追加して見た目を変更
});
dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over"); // drag-overクラスを削除
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0]; // ドロップされたファイルを取得
  if (file) handleFile(file); // ファイルがあればhandleFile関数を実行
});

// 背景色ピッカーの値が変わったら、背景色を更新して再描画
bgColorPicker.addEventListener("input", (e) => {
  bgColor = e.target.value;
  drawImage();
});

// 保存形式のラジオボタンが変更されたら、保存形式を更新
formatSelector.addEventListener("change", (e) => {
  imageFormat = e.target.value;
});

// 各種ボタンのクリックイベント
downloadBtn.addEventListener("click", downloadImage); // ダウンロードボタン
resetBtn.addEventListener("click", resetApp); // リセットボタン
adjustPositionBtn.addEventListener("click", openPositionEditor); // 位置調整モーダルを開く
resetPositionBtn.addEventListener("click", () => {
  // 位置・サイズをリセット
  resetImageState();
  drawImage();
});

// モーダル関連のクリックイベント
closeModalBtn.addEventListener("click", closePositionEditor); // モーダルを閉じる
upBtn.addEventListener("click", () => moveImage(0, -1)); // 1px上に移動
downBtn.addEventListener("click", () => moveImage(0, 1)); // 1px下に移動
leftBtn.addEventListener("click", () => moveImage(-1, 0)); // 1px左に移動
rightBtn.addEventListener("click", () => moveImage(1, 0)); // 1px右に移動

// モーダル内Canvasでのマウスイベント（ドラッグ＆ドロップによる移動、ホイールによる拡縮）
editorCanvas.addEventListener("mousedown", handleMouseDown); // マウスボタンが押された時
editorCanvas.addEventListener("mousemove", handleMouseMove); // マウスが移動した時
editorCanvas.addEventListener("mouseup", handleMouseUp); // マウスボタンが離された時
editorCanvas.addEventListener("mouseleave", handleMouseLeave); // マウスカーソルがCanvasから出た時
editorCanvas.addEventListener("wheel", handleWheel); // マウスホイールが操作された時
editorCanvas.addEventListener("mouseenter", handleMouseEnter); // マウスカーソルがCanvasに入った時

// --- 機能ごとの関数 ---

/**
 * ユーザーが選択またはドロップしたファイルを処理する関数
 * @param {File} file - ユーザーが選択したファイルオブジェクト
 */
function handleFile(file) {
  // ファイル形式のバリデーション
  if (!file.type.startsWith("image/")) {
    alert("画像ファイルを選択してください。");
    return;
  }
  // ファイルサイズのバリデーション
  if (file.size > 10 * 1024 * 1024) {
    // 10MB
    alert(
      "ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。"
    );
    return;
  }

  // ファイル名から拡張子を除いた部分を取得して保存（ダウンロード時のファイル名に使用）
  const lastDot = file.name.lastIndexOf(".");
  originalFilename =
    lastDot === -1 ? file.name : file.name.substring(0, lastDot);

  // FileReaderを使ってファイルを読み込む
  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImage = new Image();
    // 画像の読み込みが完了したら実行
    uploadedImage.onload = () => {
      // アップロード画面を非表示にし、編集画面を表示
      uploadView.classList.add("hidden");
      editorView.classList.remove("hidden");
      // 画像の状態を初期化（中央配置など）
      resetImageState();
      // Canvasに画像を描画
      drawImage();
    };
    // 読み込んだデータをImageオブジェクトのソースに設定
    uploadedImage.src = e.target.result;
  };
  // ファイルをData URLとして読み込む
  reader.readAsDataURL(file);
}

/**
 * Canvasに推奨サイズのガイドライン（赤色の破線）を描画する関数
 * @param {CanvasRenderingContext2D} ctx - 描画対象のCanvasコンテキスト
 * @param {number} [scale=1] - 描画スケール（モーダル内の拡大Canvas用）
 */
function drawSizeGuides(ctx, scale = 1) {
  const canvasSize = 130 * scale;
  ctx.strokeStyle = "rgba(255, 0, 0, 0.7)"; // 線の色（半透明の赤）
  ctx.lineWidth = 1 * scale; // 線の太さ
  ctx.setLineDash([4 * scale, 2 * scale]); // 破線の設定

  // 内側のガイド (54x54px) を描画
  const minSize = 54 * scale;
  const minXY = (canvasSize - minSize) / 2;
  ctx.strokeRect(minXY, minXY, minSize, minSize);

  // 外側のガイド (90x90px) を描画
  const maxSize = 90 * scale;
  const maxXY = (canvasSize - maxSize) / 2;
  ctx.strokeRect(maxXY, maxXY, maxSize, maxSize);

  // 破線の設定をリセット
  ctx.setLineDash([]);
}

/**
 * メインのプレビューCanvasに背景と画像を描画する関数
 */
function drawImage() {
  if (!uploadedImage) return; // 画像がなければ何もしない

  // Canvasをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景色で塗りつぶし
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 画像のアスペクト比を保ったまま、指定されたlogoSizeに収まるように幅(w)と高さ(h)を計算
  let w, h;
  if (uploadedImage.width > uploadedImage.height) {
    // 横長の画像
    w = logoSize;
    h = logoSize * (uploadedImage.height / uploadedImage.width);
  } else {
    // 縦長または正方形の画像
    h = logoSize;
    w = logoSize * (uploadedImage.width / uploadedImage.height);
  }

  // Canvasに画像を描画
  ctx.drawImage(uploadedImage, logoX, logoY, w, h);
  // ガイドラインを描画
  drawSizeGuides(ctx);

  // 位置調整モーダルが開いている場合は、モーダルのCanvasも更新する
  if (!positionEditorModal.classList.contains("hidden")) {
    drawEditorCanvas();
  }
}

/**
 * モーダル内の拡大Canvasに背景と画像を描画する関数
 */
function drawEditorCanvas() {
  if (!uploadedImage) return;

  editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);

  editorCtx.fillStyle = bgColor;
  editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);

  // プレビューCanvasに対する拡大率を計算
  const editorScale = editorCanvas.width / canvas.width;

  // プレビューと同様に画像サイズを計算し、拡大率を適用
  let w, h;
  if (uploadedImage.width > uploadedImage.height) {
    w = logoSize * editorScale;
    h = logoSize * (uploadedImage.height / uploadedImage.width) * editorScale;
  } else {
    h = logoSize * editorScale;
    w = logoSize * (uploadedImage.width / uploadedImage.height) * editorScale;
  }
  const x = logoX * editorScale;
  const y = logoY * editorScale;

  // 拡大Canvasに画像を描画
  editorCtx.drawImage(uploadedImage, x, y, w, h);
  // 拡大率を考慮してガイドラインを描画
  drawSizeGuides(editorCtx, editorScale);
}

/**
 * 作成した画像をダウンロードする関数
 */
function downloadImage() {
  // ダウンロード用にガイドラインなしの画像を生成するため、一時的なCanvasを作成
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 130;
  tempCanvas.height = 130;
  const tempCtx = tempCanvas.getContext("2d");

  // 背景と画像を描画（drawImageと同様のロジック）
  tempCtx.fillStyle = bgColor;
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  let w, h;
  if (uploadedImage.width > uploadedImage.height) {
    w = logoSize;
    h = logoSize * (uploadedImage.height / uploadedImage.width);
  } else {
    h = logoSize;
    w = logoSize * (uploadedImage.width / uploadedImage.height);
  }
  tempCtx.drawImage(uploadedImage, logoX, logoY, w, h);

  // 選択されたフォーマットに応じてMIMEタイプと拡張子を設定
  const format = imageFormat === "png" ? "image/png" : "image/jpeg";
  const fileExtension = imageFormat;

  // ダウンロード用のリンク要素を生成
  const link = document.createElement("a");
  // ファイル名を設定 (例: mylogo130.jpg)
  link.download = `${originalFilename}130.${fileExtension}`;
  // Canvasの内容をData URLに変換してリンク先に設定
  link.href = tempCanvas.toDataURL(format, 0.95); // JPGの場合、品質を95%に設定
  // リンクをプログラム的にクリックしてダウンロードを実行
  link.click();
}

/**
 * アプリケーション全体の状態を初期化し、アップロード画面に戻す関数
 */
function resetApp() {
  uploadedImage = null;
  originalFilename = "";
  bgColor = "#FFFFFF";
  bgColorPicker.value = "#FFFFFF";
  imageFormat = "jpg";
  document.querySelector('input[name="format"][value="jpg"]').checked = true;
  resetImageState(); // 画像の位置・サイズもリセット
  fileInput.value = ""; // ファイル選択フォームをクリア

  // 編集画面を非表示にし、アップロード画面を表示
  editorView.classList.add("hidden");
  uploadView.classList.remove("hidden");
}

/**
 * 画像の位置とサイズを初期状態（中央配置）に戻す関数
 */
function resetImageState() {
  logoSize = 72; // サイズを初期値に
  if (!uploadedImage) return;

  // 画像を中央に配置するための座標を計算
  let w, h;
  if (uploadedImage.width > uploadedImage.height) {
    w = logoSize;
    h = logoSize * (uploadedImage.height / uploadedImage.width);
  } else {
    h = logoSize;
    w = logoSize * (uploadedImage.width / uploadedImage.height);
  }
  const canvasSize = 130;
  logoX = (canvasSize - w) / 2;
  logoY = (canvasSize - h) / 2;
}

/**
 * ズーム時に画像の中心がずれないように位置を調整する関数
 * @param {number} oldSize - ズーム前のサイズ
 * @param {number} newSize - ズーム後のサイズ
 */
function adjustPositionForZoom(oldSize, newSize) {
  if (!uploadedImage) return;

  // ズーム前後の画像の幅と高さを計算
  let oldW, oldH, newW, newH;
  if (uploadedImage.width > uploadedImage.height) {
    oldW = oldSize;
    oldH = oldSize * (uploadedImage.height / uploadedImage.width);
    newW = newSize;
    newH = newSize * (uploadedImage.height / uploadedImage.width);
  } else {
    oldH = oldSize;
    oldW = oldSize * (uploadedImage.width / uploadedImage.height);
    newH = newSize;
    newW = newSize * (uploadedImage.width / uploadedImage.height);
  }

  // サイズの変化量の半分だけ、位置をずらすことで中心を維持する
  logoX -= (newW - oldW) / 2;
  logoY -= (newH - oldH) / 2;
}

/**
 * 位置調整モーダルを表示する関数
 */
function openPositionEditor() {
  positionEditorModal.classList.remove("hidden");
  drawEditorCanvas(); // モーダル表示時にCanvasを最新の状態に更新
}

/**
 * 位置調整モーダルを非表示にする関数
 */
function closePositionEditor() {
  positionEditorModal.classList.add("hidden");
}

/**
 * 画像を指定された量だけ移動させる関数
 * @param {number} dx - X方向の移動量
 * @param {number} dy - Y方向の移動量
 */
function moveImage(dx, dy) {
  logoX += dx;
  logoY += dy;
  drawImage(); // 移動後に再描画
}

/**
 * マウスのボタンが押された時の処理（ドラッグ開始）
 */
function handleMouseDown(e) {
  isDragging = true;
  const rect = editorCanvas.getBoundingClientRect();
  // ドラッグ開始位置を記録
  dragStartX = e.clientX - rect.left;
  dragStartY = e.clientY - rect.top;
  editorCanvas.style.cursor = "grabbing"; // カーソルを「掴んでいる」状態に変更
}

/**
 * マウスが移動した時の処理（ドラッグ中）
 */
function handleMouseMove(e) {
  if (isDragging) {
    const rect = editorCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // プレビューCanvasに対する拡大率
    const editorScale = editorCanvas.width / canvas.width;

    // マウスの移動量を計算し、拡大率を考慮して画像の移動量に変換
    const dx = (mouseX - dragStartX) / editorScale;
    const dy = (mouseY - dragStartY) / editorScale;

    logoX += dx;
    logoY += dy;

    // ドラッグ開始位置を現在のマウス位置に更新
    dragStartX = mouseX;
    dragStartY = mouseY;

    drawImage(); // ドラッグ中にリアルタイムで再描画
  }
}

/**
 * マウスのボタンが離された時の処理（ドラッグ終了）
 */
function handleMouseUp() {
  isDragging = false;
  editorCanvas.style.cursor = "grab"; // カーソルを「掴める」状態に戻す
}

/**
 * マウスカーソルがCanvas要素から離れた時の処理
 */
function handleMouseLeave() {
  isDragging = false; // ドラッグ状態を解除
  editorCanvas.style.cursor = "default"; // カーソルをデフォルトに戻す
}

/**
 * マウスカーソルがCanvas要素に入った時の処理
 */
function handleMouseEnter() {
  editorCanvas.style.cursor = "grab"; // カーソルを「掴める」状態にする
}

/**
 * マウスホイールが操作された時の処理（ズーム）
 */
function handleWheel(e) {
  e.preventDefault(); // ページのスクロールを防止

  const oldSize = logoSize;
  const zoomAmount = 2; // 1回のホイール操作での拡縮量

  // ホイールを下に回すと縮小、上に回すと拡大
  const newSize = logoSize + (e.deltaY < 0 ? zoomAmount : -zoomAmount);

  // サイズが最小値(20)と最大値(200)の範囲に収まるように制限
  logoSize = Math.max(20, Math.min(200, newSize));

  // サイズが実際に変更された場合のみ実行
  if (logoSize !== oldSize) {
    adjustPositionForZoom(oldSize, logoSize); // ズーム後の位置を調整
    drawImage(); // 再描画
  }
}
