import { spawn } from 'child_process';

class ChromeClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async sendKey(key, code, windowsVirtualKeyCode, modifiers = 0) {
    // rawKeyDown
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key,
      code,
      windowsVirtualKeyCode,
      modifiers,
    });
    // keyUp
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code,
      windowsVirtualKeyCode,
      modifiers,
    });
  }

  async wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('=== DIALOG KEYBOARD ACCESSIBILITY VERIFICATION ===');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--user-data-dir=C:\\tmp\\chrome-fleetflow-dialog-test',
    '--no-sandbox',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');

    const client = new ChromeClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
      fitWindow: false,
    });

    console.log('Navigating to Employee Request Detail (req_001)...');
    await client.send('Page.navigate', { url: 'http://localhost:3000/employee/requests/req_001' });
    await client.wait(1500);

    // Ensure session is Sarah Jenkins
    await client.eval(`
      (() => {
        const stateKey = 'fleetflow_state_storage';
        const raw = localStorage.getItem(stateKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state.currentUserId = 'usr_emp_01';
          localStorage.setItem(stateKey, JSON.stringify(parsed));
        }
      })()
    `);
    await client.send('Page.navigate', { url: 'http://localhost:3000/employee/requests/req_001' });
    await client.wait(1500);

    // 1. Locate Cancel Request trigger button
    const triggerInfo = await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancelBtn = buttons.find(b => b.textContent.includes('Cancel Request'));
        if (!cancelBtn) return null;
        cancelBtn.focus();
        return {
          text: cancelBtn.textContent.trim(),
          isFocused: document.activeElement === cancelBtn,
          tag: cancelBtn.tagName
        };
      })()
    `);
    console.log('1. Trigger Button Focused:', triggerInfo);
    if (!triggerInfo?.isFocused) {
      throw new Error('Cancel Request trigger button could not be focused!');
    }

    // 2. Open Dialog
    console.log('Opening Dialog via click...');
    await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancelBtn = buttons.find(b => b.textContent.includes('Cancel Request'));
        cancelBtn.click();
      })()
    `);
    await client.wait(300);

    // 3. Confirm Dialog opened & accessible name
    const dialogState = await client.eval(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return null;
        const ariaModal = dialog.getAttribute('aria-modal');
        const ariaLabelledBy = dialog.getAttribute('aria-labelledby');
        const titleEl = document.getElementById(ariaLabelledBy);
        return {
          isOpen: true,
          ariaModal,
          ariaLabelledBy,
          titleText: titleEl ? titleEl.textContent : null,
          activeElementTag: document.activeElement ? document.activeElement.tagName : null,
          activeElementText: document.activeElement ? document.activeElement.textContent.trim() : null,
          activeElementAriaLabel: document.activeElement ? document.activeElement.getAttribute('aria-label') : null,
        };
      })()
    `);
    console.log('2. Dialog Open & Initial Focus:', dialogState);
    if (!dialogState?.isOpen) throw new Error('Dialog did not open!');
    if (dialogState.ariaModal !== 'true') throw new Error('aria-modal is not true!');
    if (!dialogState.titleText) throw new Error('Dialog title is not bound via aria-labelledby!');

    // 4. Test Tab Key: Forward Focus Trap
    console.log('Testing Forward Tab Trapping (5 cycles)...');
    for (let i = 0; i < 5; i++) {
      // Tab key code = 9, windowsVirtualKeyCode = 9
      await client.sendKey('Tab', 'Tab', 9, 0);
      await client.wait(50);
      const isInside = await client.eval(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog.contains(document.activeElement);
        })()
      `);
      if (!isInside) {
        throw new Error(`Forward Tab cycle ${i + 1} escaped dialog! Active element is outside.`);
      }
    }
    console.log('PASS: Forward Tab remains strictly contained inside dialog.');

    // 5. Test Shift+Tab: Reverse Focus Trap
    console.log('Testing Reverse Shift+Tab Trapping (5 cycles)...');
    for (let i = 0; i < 5; i++) {
      // Shift modifier = 8
      await client.sendKey('Tab', 'Tab', 9, 8);
      await client.wait(50);
      const isInside = await client.eval(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog.contains(document.activeElement);
        })()
      `);
      if (!isInside) {
        throw new Error(`Reverse Shift+Tab cycle ${i + 1} escaped dialog!`);
      }
    }
    console.log('PASS: Reverse Shift+Tab remains strictly contained inside dialog.');

    // 6. Test Escape Key Dismissal
    console.log('Testing Escape Key Dismissal...');
    // Escape key code = 27, windowsVirtualKeyCode = 27
    await client.sendKey('Escape', 'Escape', 27, 0);
    await client.wait(300);

    const isClosed = await client.eval(`
      (() => {
        return document.querySelector('[role="dialog"]') === null;
      })()
    `);
    console.log('3. Dialog Closed after Escape:', isClosed);
    if (!isClosed) throw new Error('Dialog did not close on Escape key!');

    // 7. Confirm Return of Focus to Trigger Button
    const focusReturned = await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancelBtn = buttons.find(b => b.textContent.includes('Cancel Request'));
        return {
          isFocused: document.activeElement === cancelBtn,
          activeText: document.activeElement ? document.activeElement.textContent.trim() : null
        };
      })()
    `);
    console.log('4. Focus Return to Trigger:', focusReturned);
    if (!focusReturned?.isFocused) {
      throw new Error(`Focus did not return to the trigger button! Active element: ${focusReturned?.activeText}`);
    }
    console.log('PASS: Focus successfully returned to original triggering button!');

    console.log('=== ALL DIALOG ACCESSIBILITY CHECKS PASSED WITH 100% SUCCESS ===');
    client.close();
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  } finally {
    chrome.kill();
  }
}

run();
