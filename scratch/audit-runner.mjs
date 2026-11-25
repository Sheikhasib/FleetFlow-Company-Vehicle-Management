import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.resolve('docs/reports/screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper to interact with Chrome via CDP
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

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
      fitWindow: false,
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await this.wait(1200); // Wait for hydration and rendering
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async click(selector) {
    await this.eval(`
      (() => {
        const el = document.querySelector('${selector}');
        if (el) {
          el.scrollIntoView({ block: 'center' });
          el.click();
          return true;
        }
        return false;
      })()
    `);
    await this.wait(500);
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
    return filePath;
  }

  async wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('Spawning Chrome headless...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\tmp\\chrome-fleetflow-audit',
    '--no-sandbox',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const versionRes = await fetch('http://127.0.0.1:9222/json/version');
    const version = await versionRes.json();
    console.log('Connected to Chrome:', version.Browser);

    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');

    const client = new ChromeClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    console.log('--- AUDITING LOGIN PAGE ---');
    // 1. Login Desktop
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/login');
    await client.captureScreenshot('01_login_desktop.png');

    // 2. Login Tablet
    await client.setViewport(768, 1024, false);
    await client.navigate('http://localhost:3000/login');
    await client.captureScreenshot('02_login_tablet.png');

    // 3. Login Mobile
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/login');
    await client.captureScreenshot('03_login_mobile.png');

    console.log('--- SWITCHING TO EMPLOYEE PERSONA (SARAH JENKINS) ---');
    // Set user to Sarah Jenkins (usr_emp_01) via store
    await client.eval(`
      (() => {
        // Trigger persona switch
        const stateKey = 'fleetflow_state_storage';
        const raw = localStorage.getItem(stateKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state.currentUserId = 'usr_emp_01';
          localStorage.setItem(stateKey, JSON.stringify(parsed));
        }
      })()
    `);

    console.log('--- AUDITING EMPLOYEE DASHBOARD ---');
    // 4. Dashboard Desktop
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/employee/dashboard');
    await client.captureScreenshot('04_dashboard_desktop.png');

    // 5. Dashboard Tablet
    await client.setViewport(768, 1024, false);
    await client.navigate('http://localhost:3000/employee/dashboard');
    await client.captureScreenshot('05_dashboard_tablet.png');

    // 6. Dashboard Mobile
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/dashboard');
    await client.captureScreenshot('06_dashboard_mobile.png');

    console.log('--- AUDITING VEHICLE REQUEST CREATION FORM ---');
    // 7. Request Form Desktop
    await client.setViewport(1440, 1100, false);
    await client.navigate('http://localhost:3000/employee/requests/new');
    await client.captureScreenshot('07_new_request_desktop.png');

    // 8. Request Form Mobile
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/requests/new');
    await client.captureScreenshot('08_new_request_mobile.png');

    // 9. Request Form Validation Errors (Desktop)
    await client.setViewport(1440, 1000, false);
    await client.navigate('http://localhost:3000/employee/requests/new');
    // Clear pickup and destination and submit
    await client.eval(`
      (() => {
        const dest = document.getElementById('destination');
        const purpose = document.getElementById('purpose');
        if (dest) { dest.value = ''; dest.dispatchEvent(new Event('input', { bubbles: true })); }
        if (purpose) { purpose.value = ''; purpose.dispatchEvent(new Event('input', { bubbles: true })); }
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      })()
    `);
    await client.wait(600);
    await client.captureScreenshot('09_new_request_validation_errors.png');

    // 10. Form Round-Trip & Add Colleague interaction
    await client.navigate('http://localhost:3000/employee/requests/new');
    await client.eval(`
      (() => {
        // Click round trip
        const buttons = Array.from(document.querySelectorAll('button'));
        const rtBtn = buttons.find(b => b.textContent.includes('Round-Trip Journey'));
        if (rtBtn) rtBtn.click();
        // Click add colleague
        const addBtn = buttons.find(b => b.textContent.includes('Add Travelling Colleague'));
        if (addBtn) addBtn.click();
      })()
    `);
    await client.wait(600);
    await client.captureScreenshot('10_new_request_roundtrip_colleague.png');

    console.log('--- AUDITING REQUEST LISTING PAGE ---');
    // 11. Request Table Desktop
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/employee/requests');
    await client.captureScreenshot('11_requests_table_desktop.png');

    // 12. Request Table Mobile (Card View)
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/requests');
    await client.captureScreenshot('12_requests_table_mobile.png');

    // 13. Search Filtering Interaction
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/employee/requests');
    await client.eval(`
      (() => {
        const input = document.querySelector('input[placeholder*=\"Search\"]');
        if (input) {
          input.value = 'Metropolis';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await client.wait(500);
    await client.captureScreenshot('13_requests_search_filtered.png');

    // 14. Empty State Filter
    await client.eval(`
      (() => {
        const input = document.querySelector('input[placeholder*=\"Search\"]');
        if (input) {
          input.value = 'NonexistentQueryXYZ';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await client.wait(500);
    await client.captureScreenshot('14_requests_empty_state.png');

    console.log('--- AUDITING REQUEST DETAILS PAGE ---');
    // 15. Request Details Desktop
    await client.navigate('http://localhost:3000/employee/requests/req_001');
    await client.captureScreenshot('15_request_detail_desktop.png');

    // 16. Request Details Mobile
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/requests/req_001');
    await client.captureScreenshot('16_request_detail_mobile.png');

    // 17. Cancel Request Modal Interaction
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/employee/requests/req_001');
    await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancelBtn = buttons.find(b => b.textContent.includes('Cancel Request'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await client.wait(500);
    await client.captureScreenshot('17_cancel_request_modal.png');

    console.log('--- AUDITING GLOBAL DEMO TOOLBAR & DIALOGS ---');
    // 18. Demo Reset Confirmation Dialog
    await client.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const resetBtn = buttons.find(b => b.title && b.title.includes('Reset demo data'));
        if (resetBtn) resetBtn.click();
      })()
    `);
    await client.wait(500);
    await client.captureScreenshot('18_demo_reset_modal.png');

    console.log('--- AUDITING DEMO PREVIEWS (ADMIN & DRIVER) ---');
    // 19. Admin Preview
    await client.navigate('http://localhost:3000/demo/preview?role=ADMIN');
    await client.captureScreenshot('19_demo_preview_admin.png');

    // 20. Driver Preview Mobile
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/demo/preview?role=DRIVER');
    await client.captureScreenshot('20_demo_preview_driver_mobile.png');

    console.log('--- GATHERING ACCESSIBILITY & LAYOUT METRICS ---');
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/employee/dashboard');
    const a11yMetrics = await client.eval(`
      (() => {
        const results = {};
        // 1. Heading structure
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
          tag: h.tagName,
          text: h.textContent.trim(),
        }));
        results.headings = headings;

        // 2. Buttons without accessible names
        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.trim(),
          ariaLabel: b.getAttribute('aria-label'),
          hasAccessibleName: Boolean(b.textContent.trim() || b.getAttribute('aria-label')),
        }));
        results.unlabeledButtons = buttons.filter(b => !b.hasAccessibleName);

        // 3. Form labels check
        const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
          id: i.id,
          name: i.name,
          hasLabel: Boolean(document.querySelector('label[for=\"' + i.id + '\"]') || i.closest('label')),
        }));
        results.inputs = inputs;

        // 4. Horizontal overflow check
        results.hasHorizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;
        results.scrollWidth = document.documentElement.scrollWidth;
        results.innerWidth = window.innerWidth;

        return results;
      })()
    `);

    console.log('A11y & Layout Metrics:', JSON.stringify(a11yMetrics, null, 2));

    client.close();
    chrome.kill();
    console.log('Browser inspection completed successfully!');
  } catch (err) {
    console.error('Error during browser inspection:', err);
    chrome.kill();
  }
}

run();
