  // ==========================================
  // エディタの初期化 (CodeMirror)
  // ==========================================
  const editor = CodeMirror.fromTextArea(document.getElementById("rawScript"), {
    mode: "javascript",    // JavaScriptの文法で色付け
    theme: "monokai",      // 黒背景のカッコいいテーマ
    lineNumbers: true,     // 行番号を表示
    indentUnit: 2,         // インデントの幅
    viewportMargin: Infinity // 中身に合わせて高さを自動調整
  });


  // ==========================================
  // 以下、通信・実行ロジック
  // ==========================================
  let port, writer, reader, keepReading = false;

  async function readLoop() {
    while (port.readable && keepReading) {
      const textDecoder = new TextDecoderStream();
      const closedPromise = port.readable.pipeTo(textDecoder.writable);
      reader = textDecoder.readable.getReader();
      try { 
        while (true) { 
          const { value, done } = await reader.read(); 
          if (done) break; 
        } 
      } catch (error) {} finally { reader.releaseLock(); }
    }
  }

  document.getElementById('connect').addEventListener('click', async () => {
    try {
      port = await navigator.serial.requestPort(); 
      await port.open({ baudRate: 38400 });
      writer = port.writable.getWriter();
      document.getElementById('connect').style.display = 'none';
      document.getElementById('disconnect').style.display = 'inline-block';
      keepReading = true; 
      readLoop();
    } catch (err) { alert("接続エラー: " + err.message); }
  });

  document.getElementById('disconnect').addEventListener('click', async () => {
    keepReading = false;
    if (reader) { await reader.cancel(); reader = null; }
    if (writer) { writer.releaseLock(); writer = null; }
    if (port) { await port.close(); port = null; }
    document.getElementById('connect').style.display = 'inline-block';
    document.getElementById('disconnect').style.display = 'none';
  });

  async function sendCommandMotor(v1, v2) {
    if (!writer) return;
    const cmd = `V,${Math.round(v1)},${Math.round(v2)}\n`;
    await writer.write(new TextEncoder().encode(cmd));
  }

  document.getElementById('runBtn').addEventListener('click', async () => {
    // 変更点: textareaの値ではなく、CodeMirrorエディタから直接コードを取得する
    let scriptStr = editor.getValue();
    let resultArea = document.getElementById('resultArea');

    try {
      let calcFunc = new Function(scriptStr);
      let res = calcFunc();

      if (!res || typeof res.val1 === 'undefined' || typeof res.val2 === 'undefined') {
        throw new Error("return { val1: ..., val2: ... }; の形式で値を返してください。");
      }
      if(isNaN(res.val1) || isNaN(res.val2)) {
        throw new Error("RAW値に数値以外のものが代入されています。");
      }

      let motorVal1 = Math.max(0, Math.min(4095, Math.round(res.val1)));
      let motorVal2 = Math.max(0, Math.min(4095, Math.round(res.val2)));

      let theta1 = (motorVal1 - 2048) / (4096 / 360);
      let theta2 = (motorVal2 - 2048) / (4096 / 360);

      document.getElementById('resVal1').innerText = motorVal1;
      document.getElementById('resVal2').innerText = motorVal2;
      document.getElementById('resTh1').innerText = theta1.toFixed(1);
      document.getElementById('resTh2').innerText = theta2.toFixed(1);
      resultArea.style.display = 'block'; 

      if (!writer) {
        alert("コードの評価は成功しましたが、Arduinoが接続されていません。");
      } else {
        await sendCommandMotor(motorVal1, motorVal2);
      }

    } catch (e) {
      alert("コードエラー: " + e.message);
    }
    });