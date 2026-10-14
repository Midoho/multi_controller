 // エディタの初期化
  const editor = CodeMirror.fromTextArea(document.getElementById("ikScript"), {
    mode: "javascript", theme: "monokai", lineNumbers: true, indentUnit: 2, viewportMargin: Infinity
  });

  // キャンバス描画設定
  const canvas = document.getElementById('robotCanvas');
  const ctx = canvas.getContext('2d');
  const ZOOM = 0.8; 
  const originX = canvas.width / 2;
  const originY = canvas.height / 2 + 50; // Y軸上方向を広く見せるため原点を下へ
  const scaleX = (x) => originX + (x * ZOOM);
  const scaleY = (y) => originY - (y * ZOOM);

  // 描画関数
  function drawRobot(x, y, L1, L2, th1, th2) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景グリッドと到達可能範囲
    const maxReach = L1 + L2;
    ctx.fillStyle = "rgba(173, 216, 230, 0.2)";
    ctx.beginPath(); ctx.arc(originX, originY, maxReach * ZOOM, 0, Math.PI * 2); ctx.fill();
    
    ctx.strokeStyle = "#eee"; 
    ctx.lineWidth = 1;
    
    // 目盛りのフォント設定
    ctx.font = "12px sans-serif";

    for(let i = -400; i <= 400; i += 50) {
      // グリッド線
      ctx.beginPath(); ctx.moveTo(scaleX(i), 0); ctx.lineTo(scaleX(i), canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, scaleY(i)); ctx.lineTo(canvas.width, scaleY(i)); ctx.stroke();

      // 目盛りの数字 (50ごとだと見づらいので100ごとに数字を描画)
      if (i !== 0 && i % 100 === 0) {
        ctx.fillStyle = "#888";
        // X軸の目盛り (Y=0の線の少し下)
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(i, scaleX(i), originY + 5);
        
        // Y軸の目盛り (X=0の線の少し左)
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(i, originX - 5, scaleY(i));
      }
    }

    // 原点(0)の数字
    ctx.fillStyle = "#888";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("0", originX - 5, originY + 5);

    // X軸・Y軸の太線
    ctx.strokeStyle = "#555"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(scaleX(0), 0); ctx.lineTo(scaleX(0), canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, scaleY(0)); ctx.lineTo(canvas.width, scaleY(0)); ctx.stroke();

    // ★追加: 軸の名前（ラベル）の描画
    ctx.fillStyle = "#333";
    ctx.font = "bold 14px sans-serif";
    
    // X軸ラベル (画面の右端)
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("X [mm]", canvas.width - 15, originY - 10);
    
    // Y軸ラベル (画面の上端)
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Y [mm]", originX + 15, 15);

    // 目標座標のバツ印
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleX(x) - 10, scaleY(y) - 10); ctx.lineTo(scaleX(x) + 10, scaleY(y) + 10);
    ctx.moveTo(scaleX(x) + 10, scaleY(y) - 10); ctx.lineTo(scaleX(x) - 10, scaleY(y) + 10);
    ctx.stroke();

    // アーム描画の計算 (Y軸基準)
    let rad1 = (th1 + 90.0) * Math.PI / 180.0;
    let rad2 = th2 * Math.PI / 180.0;
    let jointX = L1 * Math.cos(rad1);
    let jointY = L1 * Math.sin(rad1);
    let endX = jointX + L2 * Math.cos(rad1 + rad2);
    let endY = jointY + L2 * Math.sin(rad1 + rad2);

    // リンクの描画
    ctx.strokeStyle = "#424242"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(scaleX(0), scaleY(0)); ctx.lineTo(scaleX(jointX), scaleY(jointY)); ctx.lineTo(scaleX(endX), scaleY(endY)); ctx.stroke();
    ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(scaleX(0), scaleY(0), 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#FBC02D"; ctx.beginPath(); ctx.arc(scaleX(jointX), scaleY(jointY), 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#9C27B0"; ctx.beginPath(); ctx.arc(scaleX(endX), scaleY(endY), 10, 0, Math.PI*2); ctx.fill();
  }
  // 初期描画
  drawRobot(100, 150, 150, 150, 0, 0);

  // 実行ボタンの処理
  document.getElementById('runIkBtn').addEventListener('click', () => {
    let x = parseFloat(document.getElementById('ikTargetX').value);
    let y = parseFloat(document.getElementById('ikTargetY').value);
    let L1 = parseFloat(document.getElementById('ikTargetL1').value);
    let L2 = parseFloat(document.getElementById('ikTargetL2').value);
    let scriptStr = editor.getValue();
    
    let errorBox = document.getElementById('errorBox');
    let resultArea = document.getElementById('ikResultArea');
    errorBox.style.display = 'none';

    const mathHelper = `
      const D2R = Math.PI / 180.0;
      const R2D = 180.0 / Math.PI;
      const Sin = (deg) => Math.sin(deg * D2R);
      const Cos = (deg) => Math.cos(deg * D2R);
      const Acos = (val) => Math.acos(val) * R2D;
      const Atan = (y, x) => Math.atan2(y, x) * R2D;
      const Sqrt = Math.sqrt;
    `;

    try {
      // 1. 構文エラーのキャッチ
      let calcFunc;
      try {
        calcFunc = new Function('X', 'Y', 'L1', 'L2', mathHelper + scriptStr);
      } catch(syntaxErr) {
        throw new Error("文法エラーがあります。カンマやセミコロンの抜け、括弧の閉じ忘れを確認してください。<br>詳細: " + syntaxErr.message);
      }

      let res = calcFunc(x, y, L1, L2);

      // 2. 戻り値フォーマットの検証
      if (!res || typeof res.theta1 === 'undefined' || typeof res.val1 === 'undefined') {
        throw new Error("return {...} で正しい変数が返されていません。theta1, theta2, val1, val2 が含まれているか確認してください。");
      }

      // 3. 非数（NaN）の検証（Acosの範囲外などで発生）
      if (isNaN(res.theta1) || isNaN(res.theta2)) {
        throw new Error("計算結果が非数 (NaN) になりました。<br>ルートの中がマイナスになっていないか、Acosに -1〜1 の範囲外の値が入っていないか（目標座標が遠すぎないか）確認してください。");
      }

      // 成功時: UIの更新と描画
      document.getElementById('resTh1').innerText = res.theta1.toFixed(2);
      document.getElementById('resTh2').innerText = res.theta2.toFixed(2);
      document.getElementById('resVal1').innerText = Math.round(res.val1);
      document.getElementById('resVal2').innerText = Math.round(res.val2);
      resultArea.style.display = 'block';
      
      drawRobot(x, y, L1, L2, res.theta1, res.theta2);

    } catch (e) {
      // 失敗時: エラーメッセージを赤枠で表示
      errorBox.innerHTML = "⚠️ <b>エラーが発生しました</b><br><br>" + e.message;
      errorBox.style.display = 'block';
      resultArea.style.display = 'none';
    }
  });