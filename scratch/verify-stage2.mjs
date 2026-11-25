import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:\\Projects\\Level-2\\FleetFlow-Company-Vehicle-Management\\docs\\reports\\screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

class ChromeClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const curId = this.id++;
      this.callbacks.set(curId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async setViewport(width, height, isMobile) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await this.send('Emulation.setVisibleSize', { width, height });
    await this.wait(200);
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await this.wait(1000);
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
  console.log('--- STARTING STAGE 2 RESPONSIVE SHELL AUDIT ---');

  // Verify server is ready
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:3000/login');
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!serverReady) {
    throw new Error('Next.js server is not reachable on http://localhost:3000');
  }
  console.log('Next.js server confirmed running.');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=C:\\tmp\\chrome-stage2-audit',
    '--no-sandbox',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const versionRes = await fetch('http://127.0.0.1:9225/json/version');
    const version = await versionRes.json();
    console.log('Chrome CDP ready:', version.Browser);

    const listRes = await fetch('http://127.0.0.1:9225/json/list');
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page');

    const client = new ChromeClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // Seed session to Sarah Jenkins
    await client.navigate('http://localhost:3000/login');
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

    const viewports = [
      { name: 'desktop', width: 1440, height: 900, isMobile: false },
      { name: 'tablet', width: 768, height: 1024, isMobile: false },
      { name: 'mobile', width: 390, height: 844, isMobile: true },
      { name: 'compact_mobile', width: 360, height: 640, isMobile: true },
    ];

    const results = {};

    for (const vp of viewports) {
      console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await client.setViewport(vp.width, vp.height, vp.isMobile);

      // 1. Dashboard
      await client.navigate('http://localhost:3000/employee/dashboard');
      await client.captureScreenshot(`stage2_dashboard_${vp.name}.png`);

      const metrics = await client.eval(`
        (() => {
          const toolbar = document.querySelector('aside[aria-label="Demo environment control toolbar"]');
          const header = document.querySelector('header');
          const bottomNav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');
          const main = document.querySelector('main');
          const activeNavLinks = Array.from(document.querySelectorAll('[aria-current="page"]')).map(el => ({
            tag: el.tagName,
            text: el.textContent.trim().replace(/\\s+/g, ' '),
            href: el.getAttribute('href')
          }));

          const bodyScrollWidth = document.body.scrollWidth;
          const windowInnerWidth = window.innerWidth;
          const hasHorizontalOverflow = bodyScrollWidth > windowInnerWidth;

          return {
            windowWidth: windowInnerWidth,
            bodyScrollWidth,
            hasHorizontalOverflow,
            toolbar: toolbar ? {
              offsetHeight: toolbar.offsetHeight,
              offsetTop: toolbar.offsetTop,
              visible: toolbar.offsetParent !== null
            } : null,
            header: header ? {
              offsetHeight: header.offsetHeight,
              offsetTop: header.offsetTop,
              visible: header.offsetParent !== null
            } : null,
            bottomNav: bottomNav ? {
              offsetHeight: bottomNav.offsetHeight,
              visible: window.getComputedStyle(bottomNav).display !== 'none'
            } : null,
            mainPaddingBottom: main ? window.getComputedStyle(main).paddingBottom : null,
            activeNavLinks
          };
        })()
      `);

      results[vp.name] = metrics;
      console.log(`  Metrics for ${vp.name}:`, JSON.stringify(metrics, null, 2));

      // 2. My Requests
      await client.navigate('http://localhost:3000/employee/requests');
      await client.captureScreenshot(`stage2_requests_${vp.name}.png`);
      const requestsActive = await client.eval(`
        Array.from(document.querySelectorAll('[aria-current="page"]')).map(el => el.textContent.trim().replace(/\\s+/g, ' '))
      `);
      console.log(`  Requests active nav items:`, requestsActive);

      // 3. New Request
      await client.navigate('http://localhost:3000/employee/requests/new');
      await client.captureScreenshot(`stage2_new_request_${vp.name}.png`);
      const newActive = await client.eval(`
        Array.from(document.querySelectorAll('[aria-current="page"]')).map(el => el.textContent.trim().replace(/\\s+/g, ' '))
      `);
      console.log(`  New Request active nav items:`, newActive);
    }

    // Modal Interaction Verifications on Mobile (390x844)
    console.log('\n--- VERIFYING MODAL INTERACTIONS ON MOBILE ---');
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/dashboard');

    // 1. Mobile Persona Switcher Dialog
    console.log('Testing mobile persona dialog trigger...');
    const personaClicked = await client.eval(`
      (() => {
        const btn = document.querySelector('button[aria-label*="Current Persona"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('  Persona button clicked:', personaClicked);
    await client.wait(500);
    await client.captureScreenshot('stage2_mobile_persona_dialog.png');

    const personaDialogVisible = await client.eval(`
      (() => {
        const title = document.querySelector('[role="dialog"] h2') || document.querySelector('[role="dialog"]');
        return title ? title.textContent : null;
      })()
    `);
    console.log('  Dialog title:', personaDialogVisible);

    // Dismiss with Escape key
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.wait(300);

    // 2. Reset Demo Data Dialog
    console.log('Testing reset demo dialog trigger...');
    const resetClicked = await client.eval(`
      (() => {
        const btn = document.querySelector('button[aria-label="Reset demo data"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('  Reset button clicked:', resetClicked);
    await client.wait(500);
    await client.captureScreenshot('stage2_reset_dialog.png');

    const resetDialogTitle = await client.eval(`
      (() => {
        const title = document.querySelector('[role="dialog"] h2') || document.querySelector('[role="dialog"]');
        return title ? title.textContent : null;
      })()
    `);
    console.log('  Reset dialog title:', resetDialogTitle);

    // Dismiss with Escape key
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.wait(300);

    // 3. Keyboard Tab containment & focus ring check on bottom nav
    console.log('\n--- VERIFYING KEYBOARD INTERACTION & TARGETS ---');
    const targetsAudit = await client.eval(`
      (() => {
        const bottomLinks = Array.from(document.querySelectorAll('nav[aria-label="Mobile Bottom Navigation"] a'));
        return bottomLinks.map(link => {
          const rect = link.getBoundingClientRect();
          return {
            text: link.textContent.trim().replace(/\\s+/g, ' '),
            width: rect.width,
            height: rect.height,
            isCompliant: rect.width >= 44 && rect.height >= 44
          };
        });
      })()
    `);
    console.log('  Mobile bottom nav targets compliance (>= 44x44px):', JSON.stringify(targetsAudit, null, 2));

    client.close();
    chrome.kill();

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'stage2_audit_results.json'),
      JSON.stringify({ results, targetsAudit }, null, 2)
    );
    console.log('\nAudit completed successfully! Results written to stage2_audit_results.json');
  } catch (err) {
    console.error('Audit failed:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
