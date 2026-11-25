import { spawn } from 'child_process';
import fs from 'fs';

async function run() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--user-data-dir=C:\\tmp\\chrome-fleetflow-filter',
    '--no-sandbox',
    'about:blank',
  ]);
  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const curId = id++;
      const handler = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Set localStorage to Sarah Jenkins
    await send('Page.navigate', { url: 'http://localhost:3000/login' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: `(() => {
        const raw = localStorage.getItem('fleetflow_state_storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state.currentUserId = 'usr_emp_01';
          localStorage.setItem('fleetflow_state_storage', JSON.stringify(parsed));
        }
      })()`
    });

    // 2. Navigate to requests
    await send('Page.navigate', { url: 'http://localhost:3000/employee/requests' });
    await new Promise(r => setTimeout(r, 1000));

    // 3. Click "Approved" filter tab (which has 0 requests for Sarah Jenkins)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const approvedBtn = buttons.find(b => b.textContent.trim() === 'Approved');
        if (approvedBtn) approvedBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('docs/reports/screenshots/14_requests_empty_state_tab.png', Buffer.from(shot1.data, 'base64'));
    console.log('Saved 14_requests_empty_state_tab.png');

    // 4. Click "Pending" filter tab (which has 1 request)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const pendingBtn = buttons.find(b => b.textContent.trim() === 'Pending');
        if (pendingBtn) pendingBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 500));

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('docs/reports/screenshots/13_requests_pending_tab.png', Buffer.from(shot2.data, 'base64'));
    console.log('Saved 13_requests_pending_tab.png');

    ws.close();
    chrome.kill();
  } catch(e) {
    console.error(e);
    chrome.kill();
  }
}
run();
