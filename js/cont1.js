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
    // CodeMirrorエディタから直接コードを取得する
    let scriptStr = editor.getValue();
    let resultArea = document.getElementById('resultArea');

    try {
      let calcFunc = new Function(scriptStr);
      let res = calcFunc();

      // 戻り値自体がない（return忘れなど）場合はエラー
      if (!res || typeof res !== 'object') {
        throw new Error("return { val1: ..., val2: ... }; の形式で値を返してください。");
      }

      // どちらも入力されていない場合はエラー
      if (typeof res.val1 === 'undefined' && typeof res.val2 === 'undefined') {
        throw new Error("val1 または val2 の少なくとも一つは指定してください。");
      }

      // 省略された場合は、とりあえず 2048 を自動で代入する
      if (typeof res.val1 === 'undefined') res.val1 = 2048;
      if (typeof res.val2 === 'undefined') res.val2 = 2048;

      if (isNaN(res.val1) || isNaN(res.val2)) {
        throw new Error("RAW値に数値以外のものが代入されています。");
      }

      let theta1 = res.val1 * (360/4096);
      let theta2 = res.val2 * (360/4096);

      document.getElementById('resVal1').innerText = res.val1;
      document.getElementById('resVal2').innerText = res.val2;
      document.getElementById('resTh1').innerText = theta1.toFixed(1);
      document.getElementById('resTh2').innerText = theta2.toFixed(1);
      resultArea.style.display = 'block'; 

      if (!writer) {
        alert("コードの評価は成功しましたが、Arduinoが接続されていません。");
      } else {
        await sendCommandMotor(res.val1, res.val2);
      }

    } catch (e) {
      alert("コードエラー: " + e.message);
    }
    });