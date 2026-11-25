import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = 'C:\\Projects\\Level-2\\FleetFlow-Company-Vehicle-Management\\docs\\reports\\screenshots\\polish';
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
      } catch (e) {}
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
  console.log('=== VERIFYING STAGE 2 FINAL VISUAL POLISH ===');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9227',
    '--user-data-dir=C:\\tmp\\chrome-stage2-polish',
    '--no-sandbox',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9227/json/list');
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

    // 1. Desktop Verification (1440x900)
    console.log('\n--- 1. Checking Desktop (1440x900) Alignment ---');
    await client.setViewport(1440, 900, false);
    await client.navigate('http://localhost:3000/employee/dashboard');
    await client.captureScreenshot('polish_1440x900_dashboard.png');

    const desktopAlignment = await client.eval(`
      (() => {
        const toolbarInner = document.querySelector('aside .container');
        const headerInner = document.querySelector('header .container');
        const main = document.querySelector('main');

        const tRect = toolbarInner ? toolbarInner.getBoundingClientRect() : null;
        const hRect = headerInner ? headerInner.getBoundingClientRect() : null;
        const mRect = main ? main.getBoundingClientRect() : null;

        return {
          windowWidth: window.innerWidth,
          toolbarInner: tRect ? { left: tRect.left, right: tRect.right, width: tRect.width } : null,
          headerInner: hRect ? { left: hRect.left, right: hRect.right, width: hRect.width } : null,
          mainContainer: mRect ? { left: mRect.left, right: mRect.right, width: mRect.width } : null,
          aligned: tRect && hRect ? Math.abs(tRect.left - hRect.left) < 1 && Math.abs(tRect.width - hRect.width) < 1 : false
        };
      })()
    `);
    console.log('  Desktop Alignment Result:', desktopAlignment);

    // 2. Tablet Verification (768x1024)
    console.log('\n--- 2. Checking Tablet (768x1024) CTA Accessibility ---');
    await client.setViewport(768, 1024, false);
    await client.navigate('http://localhost:3000/employee/dashboard');
    await client.captureScreenshot('polish_768x1024_dashboard.png');

    const tabletCta = await client.eval(`
      (() => {
        // Find tablet CTA button by aria-label
        const tabletBtn = document.querySelector('header button[aria-label="New Request"]');
        if (!tabletBtn) return null;
        const rect = tabletBtn.getBoundingClientRect();
        return {
          ariaLabel: tabletBtn.getAttribute('aria-label'),
          visibleText: tabletBtn.innerText.trim(),
          textContent: tabletBtn.textContent.trim().replace(/\\s+/g, ' '),
          width: rect.width,
          height: rect.height,
          accessibleName: tabletBtn.getAttribute('aria-label') || tabletBtn.innerText
        };
      })()
    `);
    console.log('  Tablet CTA Result:', tabletCta);

    // 3. Mobile Verification (390x844)
    console.log('\n--- 3. Checking Mobile (390x844) Header Divider & Hit Targets ---');
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/dashboard');
    await client.captureScreenshot('polish_390x844_dashboard.png');

    const mobileHeader = await client.eval(`
      (() => {
        const signOutBtns = Array.from(document.querySelectorAll('header button[aria-label="Switch Persona or Sign Out"]'));
        const visibleSignOut = signOutBtns.find(b => b.offsetWidth > 0);
        if (!visibleSignOut) return null;
        const headerActions = visibleSignOut.parentElement;
        const userChip = headerActions.querySelector('.rounded-full');
        const divider = headerActions.querySelector('div[aria-hidden="true"]');

        const uRect = userChip ? userChip.getBoundingClientRect() : null;
        const dRect = divider ? divider.getBoundingClientRect() : null;
        const sRect = visibleSignOut.getBoundingClientRect();

        return {
          hasDivider: divider !== null,
          dividerRect: dRect ? { left: dRect.left, right: dRect.right, width: dRect.width, height: dRect.height } : null,
          userChipRect: uRect ? { left: uRect.left, right: uRect.right, width: uRect.width } : null,
          signOutRect: { left: sRect.left, right: sRect.right, width: sRect.width, height: sRect.height },
          gapUserToDivider: dRect && uRect ? dRect.left - uRect.right : null,
          gapDividerToSignOut: dRect ? sRect.left - dRect.right : null,
          signOutInteractiveHitArea: { width: sRect.width, height: sRect.height, isCompliant: sRect.width >= 32 && sRect.height >= 32 }
        };
      })()
    `);
    console.log('  Mobile Header Result:', mobileHeader);

    // 4. Navigation Landmarks Accessibility
    console.log('\n--- 4. Checking Navigation Landmarks Accessibility ---');
    const navAudit = await client.eval(`
      (() => {
        const navs = Array.from(document.querySelectorAll('nav')).map(nav => {
          const style = window.getComputedStyle(nav);
          return {
            ariaLabel: nav.getAttribute('aria-label'),
            display: style.display,
            visibility: style.visibility,
            isVisible: style.display !== 'none' && style.visibility !== 'hidden',
            linkCount: nav.querySelectorAll('a').length,
            links: Array.from(nav.querySelectorAll('a')).map(a => ({
              text: a.textContent.trim().replace(/\\s+/g, ' '),
              href: a.getAttribute('href'),
              ariaCurrent: a.getAttribute('aria-current')
            }))
          };
        });
        return navs;
      })()
    `);
    console.log('  Navigation Landmarks Audit on Mobile:', JSON.stringify(navAudit, null, 2));

    client.close();
    chrome.kill();
    console.log('\n=== POLISH VERIFICATION COMPLETED SUCCESSFULLY ===');
  } catch (e) {
    console.error('Polish verification failed:', e);
    chrome.kill();
    process.exit(1);
  }
}

run();
