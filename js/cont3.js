function updateVal(id) {
      document.getElementById('val_' + id).innerText = document.getElementById(id).value;
    }

    // --- Chart.js の設定 ---
    const ctx = document.getElementById('chart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: { 
        labels: [], 
        datasets: [
          { label: '角度誤差 [deg]', data: [], borderColor: '#dc3545', borderWidth: 2, tension: 0.1, pointRadius: 0 },
          { label: '平均:Mean', data: [], borderColor: '#007bff', borderWidth: 2, borderDash: [5, 5], tension: 0.1, pointRadius: 0 },
          { label: '平均二乗誤差：MSE', data: [], borderColor: '#28a745', borderWidth: 2, borderDash: [2, 2], tension: 0.1, pointRadius: 0 }
        ] 
      },
      options: { 
        animation: false, 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { 
          y: { 
            suggestedMin: -15, 
            suggestedMax: 15 
          } 
        } 
      }
    });

    let port, writer, reader, keepReading = false;
    let readableStreamClosed;
    const connectBtn = document.getElementById('connectBtn');
    const statusText = document.getElementById('statusText');

    connectBtn.addEventListener('click', async () => {
      if (port) {
        await disconnectSerial();
      } else {
        await connectSerial();
      }
    });

   async function connectSerial() {
      try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        
        connectBtn.innerText = "シリアル切断";
        connectBtn.className = "btn-disconnect";
        statusText.innerText = "接続済み (通信中)";
        statusText.style.color = "#28a745";
        
        writer = port.writable.getWriter();
        keepReading = true;
        readLoop();

        // --- 追加: 接続完了の0.5秒後に、ゼロゲインコマンドを自動送信 ---
        setTimeout(() => {
          if (writer) {
            sendCmd("PI,C,0,0,0\n");
            sendCmd("PO,C,0,0,0\n");
            console.log("接続時: ゲインを0にリセットしました");
          }
        }, 500);

      } catch (e) {
        alert("接続キャンセル、またはエラー: " + e);
      }
    }

    async function disconnectSerial() {
      keepReading = false;
      try {
        if (reader) await reader.cancel(); 
        if (readableStreamClosed) await readableStreamClosed.catch(() => {});
        if (writer) {
          writer.releaseLock();
          writer = null;
        }
        await port.close();
        port = null;
        
        connectBtn.innerText = "シリアル接続";
        connectBtn.className = "btn-connect";
        statusText.innerText = "未接続";
        statusText.style.color = "#dc3545";
      } catch (e) {
        console.error("切断エラー:", e);
      }
    }

    async function readLoop() {
      const textDecoder = new TextDecoderStream();
      readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      reader = textDecoder.readable.getReader();
      let buffer = "";
      
      try {
        while (keepReading) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let lines = buffer.split('\n');
          buffer = lines.pop(); 
          
          for (let line of lines) {
            line = line.trim();
            if (line.startsWith("T,")) {
              let parts = line.split(',');
              if (parts.length >= 2) updateChart(parseFloat(parts[1]));
            }
          }
        }
      } catch (error) {
      } finally {
        if (reader) reader.releaseLock();
      }
    }

    let timeCount = 0;
    
    function updateChart(theta) {
      chart.data.labels.push(timeCount++);
      
      // 1. 生データのプッシュ
      chart.data.datasets[0].data.push(theta);
      
      // 2. 統計の計算 (現在の配列から計算)
      const dataArr = chart.data.datasets[0].data;
      const n = dataArr.length;
      let mean = 0;
      let mse = 0;
      
      if (n > 0) {
        const sum = dataArr.reduce((acc, val) => acc + val, 0);
        mean = sum / n;
        mse = dataArr.reduce((acc, val) => acc + Math.pow(val - 0, 2), 0) / n;
      }
      
      // 3. 統計データのプッシュ
      chart.data.datasets[1].data.push(mean);
      chart.data.datasets[2].data.push(mse);
      
      // 4. データが500個(10秒)を超えたら古いものを削除
      if (chart.data.labels.length > 500) { 
        chart.data.labels.shift(); 
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
        chart.data.datasets[2].data.shift();
      }
      
      chart.update();

      // UIのテキストも更新
      document.getElementById('meanVal').innerText = mean.toFixed(3);
      document.getElementById('varVal').innerText = mse.toFixed(3);
    }

    async function sendCmd(cmd) {
      if (!writer) return; 
      const data = new TextEncoder().encode(cmd);
      await writer.write(data);
    }

    function sendPID(loop) {
      const prefix = loop === 'I' ? 'inner_' : 'outer_';
      const kp = document.getElementById(prefix + 'kp').value;
      const ki = document.getElementById(prefix + 'ki').value;
      const kd = document.getElementById(prefix + 'kd').value;
      
      sendCmd(`P${loop},C,${kp},${ki},${kd}\n`);
    }

    // --- 初期値リセット関数 ---
    function resetPID(loop) {
      if (loop === 'I') {
        // inoファイルの振子PID (PI) の初期値を直接代入
        document.getElementById('inner_kp').value = 250.0;
        document.getElementById('inner_ki').value = 2.0;
        document.getElementById('inner_kd').value = 13.0;
        
        // 画面の表示を更新
        updateVal('inner_kp');
        updateVal('inner_ki');
        updateVal('inner_kd');
        
        // マイコンに送信
        sendPID('I');
      } else if (loop === 'O') {
        // inoファイルの台車PID (PO) の初期値を直接代入
        document.getElementById('outer_kp').value = 0.00125;
        document.getElementById('outer_ki').value = 0.0;
        document.getElementById('outer_kd').value = 0.00375;
        
        // 画面の表示を更新
        updateVal('outer_kp');
        updateVal('outer_ki');
        updateVal('outer_kd');
        
        // マイコンに送信
        sendPID('O');
      }
    }