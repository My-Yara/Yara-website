/**
 * Yara Welcome Email — Google Apps Script
 *
 * Sends the consumer "welcome" email (mirrors the default in
 * /netlify/functions/get-email-template.js — WELCOME_HTML_DEFAULT).
 *
 * How to run:
 *   1. Go to https://script.google.com → New Project
 *   2. Paste this file in as Code.gs
 *   3. Set RECIPIENT, FIRST_NAME below (or leave FIRST_NAME blank to auto-derive)
 *   4. Run sendWelcomeEmail() — first run will prompt for Gmail permission
 *
 * Notes:
 *   - Sends from the Google account running the script (quota: 100/day consumer, 1500/day Workspace)
 *   - For bulk, use sendBulkWelcomeEmails() with a RECIPIENTS array
 */

// ───────────────────────────── Config ─────────────────────────────
const RECIPIENT   = 'ain@my-yara.com';           // ← set recipient here
const FIRST_NAME  = '';                          // ← optional; blank = derived from email prefix
const APP_STORE_LINK = '#';                      // welcome template doesn't use this, kept for parity
const FROM_NAME   = 'Yara';                      // shown as sender display name
const REPLY_TO    = 'hello@my-yara.com';

const SUBJECT = "Thanks for joining the Yara waitlist";

// ─────────────────────────── Email HTML ───────────────────────────
const WELCOME_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FDFCFF;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:16px;">
      <img src="https://www.my-yara.com/yara_butterfly.png" alt="Yara" width="40" height="40" style="width:40px;height:40px;" />
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1A1A2E;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.03em;">You're on the list.</h1>
      <p style="color:#4A4A68;font-size:15px;margin:10px 0 0;font-weight:400;">Welcome.</p>
    </div>

    <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.07);border-radius:20px;padding:24px;margin-bottom:20px;">
      <p style="color:#4A4A68;font-size:15px;line-height:1.65;margin:0 0 14px;">
        Thanks for signing up. We're glad you're here.
      </p>
      <p style="color:#4A4A68;font-size:14px;line-height:1.65;margin:0;">
        Yara is an AI advocate that fights to save you money. She analyzes your bills, finds overcharges and better deals, then takes action: negotiating with providers, switching plans, and cancelling services you don't need. No more sitting on hold.
      </p>
    </div>

    <div style="background:linear-gradient(135deg,rgba(108,58,237,0.08),rgba(167,139,250,0.05));border:1px solid rgba(108,58,237,0.2);border-radius:20px;padding:24px;margin-bottom:20px;text-align:center;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.1em;">A thank-you for joining early</p>
      <p style="color:#1A1A2E;font-size:20px;font-weight:800;margin:0 0 10px;line-height:1.3;letter-spacing:-0.02em;">6 months of Yara, free on us</p>
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0;">
        No card up front. No fine print. Yours when we open your spot.
      </p>
    </div>

    <div style="color:#4A4A68;font-size:14px;line-height:1.65;margin-bottom:20px;padding:0 4px;">
      <p style="margin:0;">
        We're letting people in carefully so Yara can give every early member real attention. We don't have a fixed date yet, but when your invite arrives, you'll get a private App Store link and be up and running in minutes.
      </p>
    </div>

    <div style="background:rgba(108,58,237,0.05);border:1px solid rgba(108,58,237,0.12);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">One small favor</p>
      <p style="color:#4A4A68;font-size:13px;line-height:1.6;margin:0;">
        Add <strong style="color:#1A1A2E;">hello@my-yara.com</strong> to your contacts so our invite lands in your inbox, not spam.
      </p>
    </div>

    <div style="text-align:center;padding-top:8px;">
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0 0 6px;">
        Questions? Just reply. We read every message.
      </p>
      <p style="color:#8888A4;font-size:13px;margin:0;">
        - The Yara team
      </p>
    </div>

    <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid rgba(0,0,0,0.06);">
      <p style="color:rgba(26,26,46,0.3);font-size:11px;margin:0;">
        Yara | Optimize Every Dollar. Protect Every Right.<br>
        <a href="https://my-yara.com" style="color:#6C3AED;text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

// ──────────────────────── Variable substitution ────────────────────────
// Mirrors the server-side replacement in submit-early-access.js / send-email.js
function interpolate_(html, vars) {
  return html
    .replace(/\{\{email\}\}/g,        vars.email        || '')
    .replace(/\{\{firstName\}\}/g,    vars.firstName    || '')
    .replace(/\{\{appStoreLink\}\}/g, vars.appStoreLink || '#');
}

function deriveFirstName_(email) {
  const prefix = String(email).split('@')[0] || '';
  return prefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

// ──────────────────────── Single-recipient send ────────────────────────
function sendWelcomeEmail() {
  const firstName = FIRST_NAME || deriveFirstName_(RECIPIENT);
  const html = interpolate_(WELCOME_HTML, {
    email: RECIPIENT,
    firstName,
    appStoreLink: APP_STORE_LINK
  });
  const subject = interpolate_(SUBJECT, { email: RECIPIENT, firstName, appStoreLink: APP_STORE_LINK });

  GmailApp.sendEmail(RECIPIENT, subject, stripHtml_(html), {
    htmlBody: html,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });

  Logger.log('Sent welcome email to ' + RECIPIENT);
}

// ──────────────────────── Bulk send ────────────────────────
// Usage: edit RECIPIENTS below, then Run → sendBulkWelcomeEmails
function sendBulkWelcomeEmails() {
  const RECIPIENTS = [
    // { email: 'ain@example.com', firstName: 'Ain' },
    // { email: 'jane.doe@example.com' },   // firstName will be derived
  ];

  if (!RECIPIENTS.length) {
    Logger.log('No recipients configured — edit RECIPIENTS array.');
    return;
  }

  const quotaRemaining = MailApp.getRemainingDailyQuota();
  if (RECIPIENTS.length > quotaRemaining) {
    throw new Error(`Not enough quota: ${RECIPIENTS.length} recipients but only ${quotaRemaining} sends left today.`);
  }

  let sent = 0, failed = 0;
  RECIPIENTS.forEach(r => {
    try {
      const firstName = r.firstName || deriveFirstName_(r.email);
      const html = interpolate_(WELCOME_HTML, {
        email: r.email,
        firstName,
        appStoreLink: APP_STORE_LINK
      });
      const subject = interpolate_(SUBJECT, { email: r.email, firstName, appStoreLink: APP_STORE_LINK });
      GmailApp.sendEmail(r.email, subject, stripHtml_(html), {
        htmlBody: html,
        name: FROM_NAME,
        replyTo: REPLY_TO
      });
      sent++;
    } catch (err) {
      Logger.log('Failed ' + r.email + ': ' + err.message);
      failed++;
    }
  });

  Logger.log(`Done: ${sent} sent, ${failed} failed.`);
}

// Plain-text fallback for clients that don't render HTML
function stripHtml_(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
