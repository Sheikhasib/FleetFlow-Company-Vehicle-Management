import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const AUDIT_SCREENSHOTS_DIR = 'C:\\Projects\\Level-2\\FleetFlow-Company-Vehicle-Management\\docs\\reports\\screenshots\\audit_stage2';
if (!fs.existsSync(AUDIT_SCREENSHOTS_DIR)) {
  fs.mkdirSync(AUDIT_SCREENSHOTS_DIR, { recursive: true });
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
    const filePath = path.join(AUDIT_SCREENSHOTS_DIR, filename);
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
  console.log('=== STARTING VISUAL SELF-AUDIT FOR STAGE 2 ===');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--user-data-dir=C:\\tmp\\chrome-stage2-selfaudit',
    '--no-sandbox',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9226/json/list');
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
      { name: '390x844', width: 390, height: 844, isMobile: true, label: 'Standard Mobile' },
      { name: '360x640', width: 360, height: 640, isMobile: true, label: 'Compact Mobile' },
      { name: '768x1024', width: 768, height: 1024, isMobile: false, label: 'Tablet' },
      { name: '1440x900', width: 1440, height: 900, isMobile: false, label: 'Desktop' },
    ];

    const auditData = {
      viewports: {},
      routeActiveStates: {},
      overlapAudit: {},
      dialogAudit: {},
    };

    // 1. Per-viewport inspections
    for (const vp of viewports) {
      console.log(`\n--- Inspecting ${vp.label} (${vp.name}) ---`);
      await client.setViewport(vp.width, vp.height, vp.isMobile);

      await client.navigate('http://localhost:3000/employee/dashboard');
      await client.captureScreenshot(`audit_${vp.name}_dashboard.png`);

      const vpMetrics = await client.eval(`
        (() => {
          const toolbar = document.querySelector('aside[aria-label="Demo environment control toolbar"]');
          const header = document.querySelector('header');
          const bottomNav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');
          const main = document.querySelector('main');

          const tRect = toolbar ? toolbar.getBoundingClientRect() : null;
          const hRect = header ? header.getBoundingClientRect() : null;
          const bRect = bottomNav ? bottomNav.getBoundingClientRect() : null;
          const mStyle = main ? window.getComputedStyle(main) : null;

          // Check if bottom nav is visible
          const isBottomNavVisible = bottomNav && window.getComputedStyle(bottomNav).display !== 'none';

          // Check scroll metrics
          const scrollH = document.documentElement.scrollHeight;
          const innerH = window.innerHeight;
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;

          // Check header nav links (if visible)
          const headerNavLinks = Array.from(document.querySelectorAll('header nav a')).map(a => ({
            text: a.textContent.trim(),
            rect: a.getBoundingClientRect(),
            visible: window.getComputedStyle(a).display !== 'none'
          }));

          // Check bottom nav items
          const bottomNavLinks = bottomNav ? Array.from(bottomNav.querySelectorAll('a')).map(a => {
            const rect = a.getBoundingClientRect();
            return {
              text: a.textContent.trim().replace(/\\s+/g, ' '),
              rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
              ariaCurrent: a.getAttribute('aria-current')
            };
          }) : [];

          return {
            viewport: { width: innerW, height: innerH },
            scroll: { scrollWidth: scrollW, hasHorizontalOverflow: scrollW > innerW },
            toolbar: tRect ? { height: tRect.height, top: tRect.top } : null,
            header: hRect ? { height: hRect.height, top: hRect.top } : null,
            totalTopOverhead: (tRect ? tRect.height : 0) + (hRect ? hRect.height : 0),
            bottomNav: isBottomNavVisible && bRect ? {
              height: bRect.height,
              top: bRect.top,
              bottom: bRect.bottom,
              items: bottomNavLinks
            } : null,
            main: mStyle ? {
              paddingTop: mStyle.paddingTop,
              paddingBottom: mStyle.paddingBottom,
              paddingLeft: mStyle.paddingLeft,
              paddingRight: mStyle.paddingRight,
            } : null,
            headerNavLinks
          };
        })()
      `);

      auditData.viewports[vp.name] = vpMetrics;
      console.log(`  Metrics for ${vp.name}:`, JSON.stringify(vpMetrics, null, 2));

      // Scroll to bottom and test content occlusion
      await client.eval(`window.scrollTo(0, document.body.scrollHeight)`);
      await client.wait(300);
      await client.captureScreenshot(`audit_${vp.name}_dashboard_scrolled.png`);

      const scrollOcclusion = await client.eval(`
        (() => {
          const bottomNav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');
          if (!bottomNav || window.getComputedStyle(bottomNav).display === 'none') {
            return { hasOcclusion: false, note: 'No bottom nav visible' };
          }
          const navTop = bottomNav.getBoundingClientRect().top;
          const main = document.querySelector('main');
          const mainBottom = main ? main.getBoundingClientRect().bottom : 0;

          // Find the lowest visible interactive element or text card in main
          const cards = Array.from(main.querySelectorAll('.rounded-lg, button, a, table, tr, p'));
          let lowestBottom = 0;
          let lowestEl = null;
          cards.forEach(c => {
            const r = c.getBoundingClientRect();
            if (r.bottom > lowestBottom && r.height > 0) {
              lowestBottom = r.bottom;
              lowestEl = c.className || c.tagName;
            }
          });

          return {
            hasOcclusion: lowestBottom > navTop,
            navTop,
            lowestBottom,
            clearance: navTop - lowestBottom,
            lowestEl
          };
        })()
      `);
      console.log(`  Scroll bottom occlusion check on ${vp.name}:`, scrollOcclusion);
      auditData.viewports[vp.name].scrollOcclusion = scrollOcclusion;
    }

    // 2. Active Navigation States across all 4 routes
    console.log('\n--- VERIFYING ACTIVE NAVIGATION STATES ACROSS ROUTES ---');
    const testRoutes = [
      { path: '/employee/dashboard', expected: 'Dashboard' },
      { path: '/employee/requests', expected: 'My Requests' },
      { path: '/employee/requests/new', expected: 'New Request' },
      { path: '/employee/requests/req_001', expected: 'My Requests' }, // Detail page
    ];

    // Check on Desktop (1440x900)
    await client.setViewport(1440, 900, false);
    for (const tr of testRoutes) {
      await client.navigate(`http://localhost:3000${tr.path}`);
      await client.captureScreenshot(`audit_desktop_${tr.path.replaceAll('/', '_')}.png`);
      const activeInfo = await client.eval(`
        (() => {
          const actives = Array.from(document.querySelectorAll('[aria-current="page"]')).map(el => ({
            tag: el.tagName,
            text: el.textContent.trim().replace(/\\s+/g, ' '),
            href: el.getAttribute('href'),
            location: el.closest('header') ? 'header' : el.closest('nav') ? 'nav' : 'other'
          }));
          return actives;
        })()
      `);
      console.log(`  Desktop Route: ${tr.path} -> Active items:`, activeInfo);
      auditData.routeActiveStates[`desktop_${tr.path}`] = activeInfo;
    }

    // Check on Mobile (390x844)
    await client.setViewport(390, 844, true);
    for (const tr of testRoutes) {
      await client.navigate(`http://localhost:3000${tr.path}`);
      await client.captureScreenshot(`audit_mobile_${tr.path.replaceAll('/', '_')}.png`);
      const activeInfo = await client.eval(`
        (() => {
          const actives = Array.from(document.querySelectorAll('[aria-current="page"]')).map(el => ({
            tag: el.tagName,
            text: el.textContent.trim().replace(/\\s+/g, ' '),
            href: el.getAttribute('href'),
            location: el.closest('nav[aria-label="Mobile Bottom Navigation"]') ? 'bottom-nav' : el.closest('header') ? 'header' : 'other'
          }));
          return actives;
        })()
      `);
      console.log(`  Mobile Route: ${tr.path} -> Active items:`, activeInfo);
      auditData.routeActiveStates[`mobile_${tr.path}`] = activeInfo;
    }

    // 3. Overlap Audit: 44x44px Hit Target Collisions
    console.log('\n--- AUDITING 44x44px HIT TARGET OVERLAPS ---');
    await client.setViewport(390, 844, true);
    await client.navigate('http://localhost:3000/employee/dashboard');

    const overlapResults = await client.eval(`
      (() => {
        // Collect interactive elements in header, toolbar, bottomNav
        const toolbar = document.querySelector('aside[aria-label="Demo environment control toolbar"]');
        const header = document.querySelector('header');
        const bottomNav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');

        const inspectGroup = (container, name) => {
          if (!container) return [];
          const interactives = Array.from(container.querySelectorAll('button, a, select, input'));
          const items = interactives.map(el => {
            const r = el.getBoundingClientRect();
            return {
              text: el.textContent.trim().replace(/\\s+/g, ' ') || el.getAttribute('aria-label') || el.tagName,
              rect: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
            };
          });

          // Check pairwise overlaps
          const overlaps = [];
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const a = items[i].rect;
              const b = items[j].rect;
              // Check intersection
              const xOverlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const yOverlap = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              if (xOverlap > 0 && yOverlap > 0) {
                overlaps.push({
                  itemA: items[i].text,
                  itemB: items[j].text,
                  xOverlap,
                  yOverlap
                });
              }
            }
          }
          return { name, items, overlaps };
        };

        return {
          toolbar: inspectGroup(toolbar, 'toolbar'),
          header: inspectGroup(header, 'header'),
          bottomNav: inspectGroup(bottomNav, 'bottomNav')
        };
      })()
    `);
    console.log('  Overlap results on Mobile (390x844):', JSON.stringify(overlapResults, null, 2));
    auditData.overlapAudit = overlapResults;

    // 4. Modal and Dialog Positioning Audit
    console.log('\n--- AUDITING MODAL AND DIALOG POSITIONING ---');
    // Mobile persona dialog
    await client.eval(`document.querySelector('button[aria-label*="Current Persona"]').click()`);
    await client.wait(400);
    const personaDialogMetrics = await client.eval(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return null;
        const rect = dialog.getBoundingClientRect();
        return {
          dialogRect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          isWithinViewport: rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight,
          windowW: window.innerWidth,
          windowH: window.innerHeight
        };
      })()
    `);
    console.log('  Persona Dialog metrics:', personaDialogMetrics);
    auditData.dialogAudit.personaDialog = personaDialogMetrics;
    await client.captureScreenshot('audit_persona_dialog_position.png');

    // Dismiss dialog
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.wait(300);

    // Reset dialog
    await client.eval(`document.querySelector('button[aria-label="Reset demo data"]').click()`);
    await client.wait(400);
    const resetDialogMetrics = await client.eval(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return null;
        const rect = dialog.getBoundingClientRect();
        return {
          dialogRect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          isWithinViewport: rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight,
          windowW: window.innerWidth,
          windowH: window.innerHeight
        };
      })()
    `);
    console.log('  Reset Dialog metrics:', resetDialogMetrics);
    auditData.dialogAudit.resetDialog = resetDialogMetrics;
    await client.captureScreenshot('audit_reset_dialog_position.png');

    // Dismiss dialog
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape' });
    await client.wait(300);

    // Save full JSON output
    fs.writeFileSync(
      path.join(AUDIT_SCREENSHOTS_DIR, 'visual_self_audit_data.json'),
      JSON.stringify(auditData, null, 2)
    );
    console.log('\n=== AUDIT COMPLETED SUCCESSFULLY ===');

    client.close();
    chrome.kill();
  } catch (err) {
    console.error('Audit script failed:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
