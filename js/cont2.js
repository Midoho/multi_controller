
  // ==========================================
  // エディタの初期化 (CodeMirror)
  // ==========================================
  const editor = CodeMirror.fromTextArea(document.getElementById("ikScript"), {
    mode: "javascript",
    theme: "monokai",
    lineNumbers: true,
    indentUnit: 2,
    viewportMargin: Infinity
  });

  // ==========================================
  // タブ切り替え制御
  // ==========================================
  let activeTabId = 'tab-ik';

  function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    if (event && event.target && event.target.tagName === 'BUTTON') {
      event.target.classList.add('active');
    }
    activeTabId = tabId;

    // 非表示状態から表示状態に戻った際にエディタの描画を更新する
    if (tabId === 'tab-ik') {
      setTimeout(() => editor.refresh(), 10);
    }
  }

  let activeIkMode = 'custom';
  // textareaの値ではなく、editor.getValue()から取得
  let savedIkScript = editor.getValue(); 
  document.getElementById('currentActiveScript').textContent = savedIkScript; 

  const canvas = document.getElementById('robotCanvas');
  const ctx = canvas.getContext('2d');
  
  const ZOOM = 0.9; 
  const originX = canvas.width / 2;
  const originY = canvas.height / 2;
  const scaleX = (x) => originX + (x * ZOOM);
  const scaleY = (y) => originY - (y * ZOOM);

  let L1 = 150.0;
  let L2 = 150.0;
  let MAX_REACH = L1 + L2;

  let robX = 0.0;
  let robY = 150.0;
  let angle1_deg = 0.0;
  let angle2_deg = 0.0;
  let motorVal1 = 2048; 
  let motorVal2 = 2048;

  function clampToCircle(x, y) {
    let r = Math.sqrt(x*x + y*y);
    let targetX = x;
    let targetY = y;

    // 遠すぎる場合は最大リーチに丸める
    if (r > MAX_REACH - 1.0) {
      targetX = x * (MAX_REACH - 1.0) / r;
      targetY = y * (MAX_REACH - 1.0) / r;
    }
    
    else if (r < 50.0) {
      if (r === 0) {
        // 原点付近に寄せ付けない
        targetX = 0;
        targetY = 50.0; 
      } else {
        //5センチ以上近づけないようにする
        targetX = targetX * 50.0 / r;
        targetY = targetY * 50.0 / r;
      }
    }

    return { x: targetX, y: targetY };
  }

  function drawEnvironment() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "rgba(173, 216, 230, 0.2)";
    ctx.beginPath(); ctx.arc(originX, originY, MAX_REACH * ZOOM, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#81D4FA"; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); 

    ctx.font = "12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = -350; i <= 350; i += 50) {
      let px = scaleX(i);
      ctx.beginPath(); ctx.strokeStyle = (i === 0) ? "#555" : "#eee"; ctx.lineWidth = (i === 0) ? 2 : 1;
      ctx.moveTo(px, 0); ctx.lineTo(px, canvas.height); ctx.stroke();
      if (i !== 0 && i % 100 === 0) { ctx.fillStyle = "#888"; ctx.fillText(i, px, originY + 15); }
    }
    for (let i = -350; i <= 350; i += 50) {
      let py = scaleY(i);
      ctx.beginPath(); ctx.strokeStyle = (i === 0) ? "#555" : "#eee"; ctx.lineWidth = (i === 0) ? 2 : 1;
      ctx.moveTo(0, py); ctx.lineTo(canvas.width, py); ctx.stroke();
      if (i !== 0 && i % 100 === 0) { ctx.fillStyle = "#888"; ctx.textAlign = "right"; ctx.fillText(i, originX - 8, py); }
    }
    ctx.fillStyle = "#333"; ctx.textAlign = "right"; ctx.fillText("0", originX - 8, originY + 15);

    ctx.fillStyle = "#222";
    ctx.font = "bold 15px sans-serif";
    
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("X", canvas.width - 15, originY - 10);
    
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Y", originX + 12, 15);
  }

  let trajectoryPath = [];

  function updateViewFK() {
    document.getElementById('curTh1').innerText = angle1_deg.toFixed(1);
    document.getElementById('curTh2').innerText = angle2_deg.toFixed(1);

    drawEnvironment();

    let rad1 = (angle1_deg + 90.0) * Math.PI / 180.0;
    let rad2 = angle2_deg * Math.PI / 180.0;

    let jointX = L1 * Math.cos(rad1);
    let jointY = L1 * Math.sin(rad1);
    let endX = jointX + L2 * Math.cos(rad1 + rad2);
    let endY = jointY + L2 * Math.sin(rad1 + rad2);

    if (trajectoryPath.length > 0) {
      ctx.strokeStyle = "rgba(233, 30, 99, 0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(scaleX(trajectoryPath[0].x), scaleY(trajectoryPath[0].y));
      for (let i = 1; i < trajectoryPath.length; i++) {
        ctx.lineTo(scaleX(trajectoryPath[i].x), scaleY(trajectoryPath[i].y));
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "#424242"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(0));
    ctx.lineTo(scaleX(jointX), scaleY(jointY));
    ctx.lineTo(scaleX(endX), scaleY(endY));
    ctx.stroke();

    ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(scaleX(0), scaleY(0), 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#FBC02D"; ctx.beginPath(); ctx.arc(scaleX(jointX), scaleY(jointY), 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#9C27B0"; ctx.beginPath(); ctx.arc(scaleX(endX), scaleY(endY), 10, 0, Math.PI*2); ctx.fill();
  }
  
  updateViewFK();

  function calculateIK(x, y) {
    if (activeIkMode === 'teacher') {
      let cosT2 = (x*x + y*y - L1*L1 - L2*L2) / (2 * L1 * L2);
      cosT2 = Math.max(-1, Math.min(1, cosT2));
      let th2_rad = Math.acos(cosT2);
      let th1_rad = Math.atan2(y, x) - Math.atan2(L2 * Math.sin(th2_rad), L1 + L2 * cosT2);
      
      let t1 = th1_rad * 180.0 / Math.PI - 90;
      let t2 = th2_rad * 180.0 / Math.PI;
      
      return {
        theta1: t1,
        theta2: t2,
        val1: t1 * (4096 / 360) + 2048,
        val2: t2 * (4096 / 360) + 2048
      };
    } else {
      let scriptStr = savedIkScript; //記入された文字を読み取る（文字列として代入されている）
      //function Sin(deg) {  return Math.sin(deg * D2R);}とconst Sin = (deg) => Math.sin(deg * D2R);は同意
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
        let calcFunc = new Function('X', 'Y', 'L1', 'L2', mathHelper + scriptStr);//与えられた文字列から新しい関数をコンパイルする
        let res = calcFunc(x, y, L1, L2);
        
        if (!res || typeof res.theta1 === 'undefined' || typeof res.theta2 === 'undefined') {
          throw new Error("フォーマット不正");
        }
        if (isNaN(res.theta1) || isNaN(res.theta2)) {
          throw new Error("NaN発生");
        }
        if (res.theta1 < -90) {
          res.theta1 = -90;
          res.val1 = 1024;  // 2048 - 1024 (左または右の限界)
        } else if (res.theta1 > 90) {
          res.theta1 = 90;
          res.val1 = 3072;  // 2048 + 1024 (反対側の限界)
      }
        return { theta1: res.theta1, theta2: res.theta2, val1: res.val1, val2: res.val2 };
        
      } catch (e) {
        console.warn("自分で入力した式の実行エラー:", e.message);
        return { theta1: angle1_deg, theta2: angle2_deg, val1: motorVal1, val2: motorVal2 }; 
      }
    }
  }

  let port, writer, reader, keepReading = false;
  
  async function readLoop() {
    while (port.readable && keepReading) {
      const textDecoder = new TextDecoderStream();
      const closedPromise = port.readable.pipeTo(textDecoder.writable);
      reader = textDecoder.readable.getReader();
      try { while (true) { const { value, done } = await reader.read(); if (done) break; } } 
      catch (error) {} finally { reader.releaseLock(); }
    }
  }

  document.getElementById('connect').addEventListener('click', async () => {
    try {
      port = await navigator.serial.requestPort(); await port.open({ baudRate: 9600 });
      writer = port.writable.getWriter();
      document.getElementById('connect').style.display = 'none';
      document.getElementById('disconnect').style.display = 'inline-block';
      keepReading = true; readLoop();
    } catch (err) { alert("接続エラー"); }
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

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  document.getElementById('runIkBtn').addEventListener('click', async () => {
    let x = parseFloat(document.getElementById('ikTargetX').value);
    let y = parseFloat(document.getElementById('ikTargetY').value);
    let l1_val = parseFloat(document.getElementById('ikTargetL1').value);
    let l2_val = parseFloat(document.getElementById('ikTargetL2').value);
    
    // ★修正: textareaの値ではなく、editor.getValue()から取得
    let scriptStr = editor.getValue();
    let resultArea = document.getElementById('ikResultArea');

    try {
      const mathHelper = `
        const D2R = Math.PI / 180.0;
        const R2D = 180.0 / Math.PI;
        const Sin = (deg) => Math.sin(deg * D2R);
        const Cos = (deg) => Math.cos(deg * D2R);
        const Acos = (val) => Math.acos(val) * R2D;
        const Atan = (y, x) => Math.atan2(y, x) * R2D;
        const Sqrt = Math.sqrt;
      `;

      let calcFunc = new Function('X', 'Y', 'L1', 'L2', mathHelper + scriptStr);
      let res = calcFunc(x, y, l1_val, l2_val);

      if (!res || typeof res.theta1 === 'undefined' || typeof res.theta2 === 'undefined' || typeof res.val1 === 'undefined' || typeof res.val2 === 'undefined') {
        throw new Error("return { theta1: ..., theta2: ..., val1: ..., val2: ... }; の形式で値を返してください。");
      }
      if(isNaN(res.theta1) || isNaN(res.theta2)) {
        throw new Error("計算結果が非数(NaN)になりました。数式を確認してください。");
      }
      if (res.theta1 < -90) {
        res.theta1 = -90;
        res.val1 = 1024;  // 2048 - 1024 (左または右の限界)
      } else if (res.theta1 > 90) {
        res.theta1 = 90;
        res.val1 = 3072;  // 2048 + 1024 (反対側の限界)
      }

      document.getElementById('resTh1').innerText = res.theta1.toFixed(2);
      document.getElementById('resTh2').innerText = res.theta2.toFixed(2);
      document.getElementById('resVal1').innerText = Math.round(res.val1);
      document.getElementById('resVal2').innerText = Math.round(res.val2);
      resultArea.style.display = 'block'; 

      savedIkScript = scriptStr;
      activeIkMode = 'custom';
      document.getElementById('currentActiveScript').textContent = savedIkScript; 

      L1 = l1_val;
      L2 = l2_val;
      MAX_REACH = L1 + L2;
      
      angle1_deg = res.theta1;
      angle2_deg = res.theta2;
      motorVal1 = res.val1;
      motorVal2 = res.val2;

      trajectoryPath = [];
      updateViewFK(); 

      if (writer) {
        await sendCommandMotor(motorVal1, motorVal2);
      }

    } catch (e) {
      alert("エラー: " + e.message);
    }
  });

  let isDragging = false;
  let lastSentTime = 0;

  function getRobotCoordsFromMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      x: (mouseX - originX) / ZOOM,
      y: (originY - mouseY) / ZOOM
    };
  }

  canvas.addEventListener('mousedown', (e) => {
    if (activeTabId !== 'tab-manual') return; 

    let rad1 = (angle1_deg + 90.0) * Math.PI / 180.0;
    let rad2 = angle2_deg * Math.PI / 180.0;
    let endX = L1 * Math.cos(rad1) + L2 * Math.cos(rad1 + rad2);
    let endY = L1 * Math.sin(rad1) + L2 * Math.sin(rad1 + rad2);

    const mouseCoord = getRobotCoordsFromMouse(e);
    const dist = Math.sqrt((mouseCoord.x - endX)**2 + (mouseCoord.y - endY)**2);

    if (dist < 25) {
      isDragging = true;
      trajectoryPath = [];
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mousemove', async (e) => {
    if (activeTabId !== 'tab-manual') return;

    if (!isDragging) {
      let rad1 = (angle1_deg + 90.0) * Math.PI / 180.0;
      let rad2 = angle2_deg * Math.PI / 180.0;
      let endX = L1 * Math.cos(rad1) + L2 * Math.cos(rad1 + rad2);
      let endY = L1 * Math.sin(rad1) + L2 * Math.sin(rad1 + rad2);
      const mouseCoord = getRobotCoordsFromMouse(e);
      const dist = Math.sqrt((mouseCoord.x - endX)**2 + (mouseCoord.y - endY)**2);
      canvas.style.cursor = (dist < 25) ? 'grab' : 'default';
      return;
    }

    const mouseCoord = getRobotCoordsFromMouse(e);
    let clamped = clampToCircle(mouseCoord.x, mouseCoord.y);

    let angles = calculateIK(clamped.x, clamped.y);
    
    angle1_deg = angles.theta1;
    angle2_deg = angles.theta2;
    motorVal1 = angles.val1;
    motorVal2 = angles.val2;
    
    robX = clamped.x;
    robY = clamped.y;

    updateViewFK();

    const now = Date.now();
    if (now - lastSentTime > 50) {
      await sendCommandMotor(motorVal1, motorVal2); 
      lastSentTime = now;
    }
  });

  window.addEventListener('mouseup', async () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = 'default';
      await sendCommandMotor(motorVal1, motorVal2); 
    }
  });