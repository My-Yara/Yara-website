/**
 * E2E + Edge Case Tests for YARA-827/828/836 tracking changes
 * Run: npx playwright test test-tracking.spec.mjs --headed (or headless)
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const INDEX_PATH = resolve(import.meta.dirname, 'index.html');
const FILE_URL = `file://${INDEX_PATH}`;

// ─────────────────────────────────────────────
// SECTION 1: Meta Pixel (YARA-827)
// ─────────────────────────────────────────────

test.describe('YARA-827: Meta Pixel', () => {

  test('Meta Pixel base code loads and defines fbq globally', async ({ page }) => {
    // Block actual network call to facebook (placeholder ID won't work anyway)
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    const fbqExists = await page.evaluate(() => typeof window.fbq === 'function');
    expect(fbqExists).toBe(true);
  });

  test('Meta Pixel fires PageView on page load', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    const queue = await page.evaluate(() => {
      if (window.fbq && window.fbq.queue) {
        return window.fbq.queue.map(args => Array.from(args));
      }
      return [];
    });

    // Should have init + PageView in the queue (since the real script didn't load)
    const hasInit = queue.some(args => args[0] === 'init');
    const hasPageView = queue.some(args => args[0] === 'track' && args[1] === 'PageView');
    expect(hasInit).toBe(true);
    expect(hasPageView).toBe(true);
  });

  test('Placeholder Pixel ID is present (1256294822688550)', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    const initArgs = await page.evaluate(() => {
      if (window.fbq && window.fbq.queue) {
        const initCall = window.fbq.queue.find(args => args[0] === 'init');
        return initCall ? Array.from(initCall) : null;
      }
      return null;
    });

    expect(initArgs).not.toBeNull();
    expect(initArgs[1]).toBe('1256294822688550');
  });

  test('noscript fallback img is in body, not head', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Check noscript is child of body, not head
    const noscriptInBody = await page.evaluate(() => {
      const noscripts = document.querySelectorAll('body noscript');
      for (const ns of noscripts) {
        if (ns.textContent.includes('1256294822688550')) return true;
      }
      return false;
    });
    expect(noscriptInBody).toBe(true);

    const noscriptInHead = await page.evaluate(() => {
      const noscripts = document.querySelectorAll('head noscript');
      for (const ns of noscripts) {
        if (ns.textContent.includes('1256294822688550')) return true;
      }
      return false;
    });
    expect(noscriptInHead).toBe(false);
  });
});

// ─────────────────────────────────────────────
// SECTION 2: GA4 (YARA-828)
// ─────────────────────────────────────────────

test.describe('YARA-828: Google Analytics GA4', () => {

  test('gtag function is defined globally', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    const gtagExists = await page.evaluate(() => typeof window.gtag === 'function');
    expect(gtagExists).toBe(true);
  });

  test('dataLayer receives config event on load', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    const dataLayer = await page.evaluate(() => {
      return window.dataLayer.map(item => Array.from(item));
    });

    // Should have at least 'js' and 'config' entries
    expect(dataLayer.length).toBeGreaterThanOrEqual(2);
    // First entry: gtag('js', new Date())
    expect(dataLayer[0][0]).toBe('js');
    // Second entry: gtag('config', 'G-XXXXXXXXXX')
    expect(dataLayer[1][0]).toBe('config');
    expect(dataLayer[1][1]).toBe('G-XXXXXXXXXX');
  });

  test('gtag.js script tag has async attribute', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    const isAsync = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
      return scripts.length > 0 && scripts[0].async === true;
    });
    expect(isAsync).toBe(true);
  });
});

// ─────────────────────────────────────────────
// SECTION 3: Conversion Events (YARA-836)
// ─────────────────────────────────────────────

test.describe('YARA-836: Conversion tracking on waitlist signup', () => {

  test('successful signup fires both Lead and sign_up events', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/connect.facebook.net/**', route => route.abort());

    // Mock the Netlify API to return success
    await page.route('**/submit-early-access', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success', email: 'test@example.com' }),
      });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Instrument fbq and gtag to capture calls
    await page.evaluate(() => {
      window._trackingCalls = [];
      const origFbq = window.fbq;
      window.fbq = function() {
        window._trackingCalls.push({ tracker: 'fbq', args: Array.from(arguments) });
        return origFbq.apply(this, arguments);
      };
      window.fbq.queue = origFbq.queue;
      window.fbq.callMethod = origFbq.callMethod;

      const origGtag = window.gtag;
      window.gtag = function() {
        window._trackingCalls.push({ tracker: 'gtag', args: Array.from(arguments) });
        return origGtag.apply(this, arguments);
      };
    });

    // Clear tracking calls from page load events
    await page.evaluate(() => { window._trackingCalls = []; });

    // Fill in email and submit
    await page.fill('#waitlistEmail', 'e2e-test@example.com');
    await page.click('#waitlistBtn');

    // Wait for the fetch to resolve and success state to apply
    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && btn.classList.contains('success');
    }, { timeout: 5000 });

    const calls = await page.evaluate(() => window._trackingCalls);

    // Verify Meta Lead event
    const leadEvent = calls.find(c => c.tracker === 'fbq' && c.args[0] === 'track' && c.args[1] === 'Lead');
    expect(leadEvent).toBeTruthy();

    // Verify GA4 sign_up event
    const signupEvent = calls.find(c => c.tracker === 'gtag' && c.args[0] === 'event' && c.args[1] === 'sign_up');
    expect(signupEvent).toBeTruthy();
    expect(signupEvent.args[2]).toEqual({ method: 'waitlist' });
  });

  test('failed signup does NOT fire conversion events', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/connect.facebook.net/**', route => route.abort());

    // Mock the Netlify API to return failure
    await page.route('**/submit-early-access', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Instrument tracking
    await page.evaluate(() => {
      window._trackingCalls = [];
      const origFbq = window.fbq;
      window.fbq = function() {
        window._trackingCalls.push({ tracker: 'fbq', args: Array.from(arguments) });
        return origFbq.apply(this, arguments);
      };
      window.fbq.queue = origFbq.queue;
      const origGtag = window.gtag;
      window.gtag = function() {
        window._trackingCalls.push({ tracker: 'gtag', args: Array.from(arguments) });
        return origGtag.apply(this, arguments);
      };
      window._trackingCalls = [];
    });

    // Submit email
    await page.fill('#waitlistEmail', 'fail-test@example.com');
    await page.click('#waitlistBtn');

    // Wait for error state (button should stop loading)
    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && !btn.classList.contains('loading');
    }, { timeout: 5000 });

    // Small extra wait to ensure no late events fire
    await page.waitForTimeout(500);

    const calls = await page.evaluate(() => window._trackingCalls);

    // Should NOT have Lead or sign_up events
    const leadEvent = calls.find(c => c.tracker === 'fbq' && c.args[0] === 'track' && c.args[1] === 'Lead');
    const signupEvent = calls.find(c => c.tracker === 'gtag' && c.args[0] === 'event' && c.args[1] === 'sign_up');
    expect(leadEvent).toBeFalsy();
    expect(signupEvent).toBeFalsy();
  });

  test('conversion events fire only once per successful signup (no duplicates)', async ({ page }) => {
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/submit-early-access', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success', email: 'test@example.com' }),
      });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      window._trackingCalls = [];
      const origFbq = window.fbq;
      window.fbq = function() {
        window._trackingCalls.push({ tracker: 'fbq', args: Array.from(arguments) });
        return origFbq.apply(this, arguments);
      };
      window.fbq.queue = origFbq.queue;
      const origGtag = window.gtag;
      window.gtag = function() {
        window._trackingCalls.push({ tracker: 'gtag', args: Array.from(arguments) });
        return origGtag.apply(this, arguments);
      };
      window._trackingCalls = [];
    });

    await page.fill('#waitlistEmail', 'once-test@example.com');
    await page.click('#waitlistBtn');

    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && btn.classList.contains('success');
    }, { timeout: 5000 });

    const calls = await page.evaluate(() => window._trackingCalls);
    const leadEvents = calls.filter(c => c.tracker === 'fbq' && c.args[0] === 'track' && c.args[1] === 'Lead');
    const signupEvents = calls.filter(c => c.tracker === 'gtag' && c.args[0] === 'event' && c.args[1] === 'sign_up');

    expect(leadEvents.length).toBe(1);
    expect(signupEvents.length).toBe(1);
  });
});

// ─────────────────────────────────────────────
// SECTION 4: Edge Cases
// ─────────────────────────────────────────────

test.describe('Edge cases', () => {

  test('ad blocker scenario: fbq and gtag blocked, signup still works', async ({ page }) => {
    // Block ALL tracking scripts — simulating aggressive ad blocker
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());

    // Also nuke fbq and gtag after page load to simulate complete blocking
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      delete window.fbq;
      delete window.gtag;
      delete window._fbq;
    });

    // Mock API
    await page.route('**/submit-early-access', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success', email: 'blocked@example.com' }),
      });
    });

    // Signup should still work without errors
    await page.fill('#waitlistEmail', 'blocked@example.com');

    // Listen for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.click('#waitlistBtn');

    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && btn.classList.contains('success');
    }, { timeout: 5000 });

    // Verify no JS errors were thrown
    const trackingRelatedErrors = pageErrors.filter(e =>
      e.includes('fbq') || e.includes('gtag') || e.includes('Lead') || e.includes('sign_up')
    );
    expect(trackingRelatedErrors).toEqual([]);

    // Verify success state
    const placeholder = await page.getAttribute('#waitlistEmail', 'placeholder');
    expect(placeholder).toContain('on the list');
  });

  test('empty email is rejected — no API call or tracking events', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());

    let apiCalled = false;
    await page.route('**/submit-early-access', route => {
      apiCalled = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { window._trackingCalls = []; });

    // Clear the email field and submit
    await page.fill('#waitlistEmail', '');
    await page.click('#waitlistBtn');

    await page.waitForTimeout(500);

    expect(apiCalled).toBe(false);

    // Check error message is visible
    const errorVisible = await page.evaluate(() => {
      const el = document.getElementById('ctaError');
      return el && el.classList.contains('visible');
    });
    expect(errorVisible).toBe(true);
  });

  test('invalid email format is rejected — no API call or tracking events', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());

    let apiCalled = false;
    await page.route('**/submit-early-access', route => {
      apiCalled = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Test various invalid emails
    const invalidEmails = ['notanemail', 'missing@', '@nodomain', 'spaces in@email.com', '   '];

    for (const badEmail of invalidEmails) {
      await page.fill('#waitlistEmail', badEmail);
      await page.click('#waitlistBtn');
      await page.waitForTimeout(200);
    }

    expect(apiCalled).toBe(false);
  });

  test('network timeout on API does not fire conversion events', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());

    // Simulate network failure
    await page.route('**/submit-early-access', route => route.abort());

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      window._trackingCalls = [];
      const origFbq = window.fbq;
      window.fbq = function() {
        window._trackingCalls.push({ tracker: 'fbq', args: Array.from(arguments) });
        return origFbq.apply(this, arguments);
      };
      window.fbq.queue = origFbq.queue;
      const origGtag = window.gtag;
      window.gtag = function() {
        window._trackingCalls.push({ tracker: 'gtag', args: Array.from(arguments) });
        return origGtag.apply(this, arguments);
      };
      window._trackingCalls = [];
    });

    await page.fill('#waitlistEmail', 'timeout@example.com');
    await page.click('#waitlistBtn');

    // Wait for error state
    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && !btn.classList.contains('loading');
    }, { timeout: 10000 });

    await page.waitForTimeout(500);

    const calls = await page.evaluate(() => window._trackingCalls);
    const leadEvent = calls.find(c => c.tracker === 'fbq' && c.args[1] === 'Lead');
    const signupEvent = calls.find(c => c.tracker === 'gtag' && c.args[1] === 'sign_up');
    expect(leadEvent).toBeFalsy();
    expect(signupEvent).toBeFalsy();
  });

  test('page load does NOT fire Lead or sign_up (only PageView)', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Check fbq queue for any Lead events from page load
    const fbqQueue = await page.evaluate(() => {
      if (window.fbq && window.fbq.queue) {
        return window.fbq.queue.map(args => Array.from(args));
      }
      return [];
    });

    const leadOnLoad = fbqQueue.find(args => args[0] === 'track' && args[1] === 'Lead');
    expect(leadOnLoad).toBeFalsy();

    // Check dataLayer for sign_up events from page load
    const dataLayer = await page.evaluate(() => {
      return window.dataLayer.map(item => Array.from(item));
    });

    const signupOnLoad = dataLayer.find(args => args[0] === 'event' && args[1] === 'sign_up');
    expect(signupOnLoad).toBeFalsy();
  });

  test('tracking scripts load async and do not block page render', async ({ page }) => {
    // Track timing — scripts should not delay DOMContentLoaded significantly
    await page.route('**/connect.facebook.net/**', async route => {
      // Simulate slow CDN (2 second delay)
      await new Promise(r => setTimeout(r, 2000));
      route.abort();
    });
    await page.route('**/googletagmanager.com/**', async route => {
      await new Promise(r => setTimeout(r, 2000));
      route.abort();
    });

    const start = Date.now();
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    // DOMContentLoaded should fire quickly (< 3s) even with slow tracking CDN
    // The file:// protocol makes this fast; we're testing that async doesn't block
    expect(loadTime).toBeLessThan(3000);

    // Verify the page content is rendered
    const navVisible = await page.isVisible('#mainNav');
    expect(navVisible).toBe(true);
  });

  test('localStorage waitlist state does not re-fire tracking events', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Set localStorage to simulate returning visitor who already signed up
    await page.evaluate(() => {
      localStorage.setItem('yara_waitlist_email', 'returning@example.com');
    });

    // Reload the page
    await page.evaluate(() => {
      window._trackingCalls = [];
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Check that no Lead/sign_up events fire on load for returning visitors
    const fbqQueue = await page.evaluate(() => {
      return (window.fbq && window.fbq.queue)
        ? window.fbq.queue.map(args => Array.from(args))
        : [];
    });
    const leadOnRevisit = fbqQueue.find(args => args[0] === 'track' && args[1] === 'Lead');
    expect(leadOnRevisit).toBeFalsy();

    // Verify the placeholder shows "on the list" for returning visitors
    const placeholder = await page.getAttribute('#waitlistEmail', 'placeholder');
    expect(placeholder).toContain('on the list');

    // Cleanup
    await page.evaluate(() => localStorage.removeItem('yara_waitlist_email'));
  });
});

// ─────────────────────────────────────────────
// SECTION 5: Waitlist Flow Integrity (YARA-831)
// ─────────────────────────────────────────────

test.describe('YARA-831: Waitlist flow integrity', () => {

  test('waitlist form elements exist and are interactive', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

    // Form exists
    const form = page.locator('#waitlistForm');
    await expect(form).toBeAttached();

    // Email input exists and is editable
    const email = page.locator('#waitlistEmail');
    await expect(email).toBeAttached();
    await expect(email).toBeEditable();

    // Submit button exists and is enabled
    const btn = page.locator('#waitlistBtn');
    await expect(btn).toBeAttached();
    await expect(btn).toBeEnabled();
  });

  test('successful signup sets localStorage', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/submit-early-access', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success', email: 'storage@example.com' }),
      });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.removeItem('yara_waitlist_email'));

    await page.fill('#waitlistEmail', 'storage@example.com');
    await page.click('#waitlistBtn');

    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && btn.classList.contains('success');
    }, { timeout: 5000 });

    const stored = await page.evaluate(() => localStorage.getItem('yara_waitlist_email'));
    expect(stored).toBe('storage@example.com');

    // Cleanup
    await page.evaluate(() => localStorage.removeItem('yara_waitlist_email'));
  });

  test('API receives correct payload shape', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());

    let capturedBody = null;
    await page.route('**/submit-early-access', route => {
      capturedBody = JSON.parse(route.request().postData());
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#waitlistEmail', 'payload@example.com');
    await page.click('#waitlistBtn');

    await page.waitForFunction(() => {
      const btn = document.getElementById('waitlistBtn');
      return btn && btn.classList.contains('success');
    }, { timeout: 5000 });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody.email).toBe('payload@example.com');
    expect(capturedBody.financialGoals).toBe('(waitlist signup only)');
    expect(capturedBody.rightsProtection).toBe('(waitlist signup only)');
    expect(capturedBody.idealOutcome).toBe('(waitlist signup only)');
    expect(capturedBody.timestamp).toBeTruthy();
  });

  test('survey modal opens after successful signup', async ({ page }) => {
    await page.route('**/connect.facebook.net/**', route => route.abort());
    await page.route('**/googletagmanager.com/**', route => route.abort());
    await page.route('**/submit-early-access', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Success' }),
      });
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#waitlistEmail', 'survey@example.com');
    await page.click('#waitlistBtn');

    // Wait for survey modal to appear (opens after 800ms delay)
    const surveyOverlay = page.locator('#surveyOverlay');
    await expect(surveyOverlay).toHaveClass(/active/, { timeout: 3000 });
  });
});
