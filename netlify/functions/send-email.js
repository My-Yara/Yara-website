// send-email.js — Sends a custom email to a waitlist invitee using the stored template + Resend.
// Supports two templates via `templateType` body field: 'invite' (default) and 'welcome'.

const fetch = require('node-fetch');
const crypto = require('crypto');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
const UNLISTED_APP_STORE_LINK = process.env.UNLISTED_APP_STORE_LINK || 'https://apps.apple.com/app/yara/id000000000';

const TEMPLATE_FILES = {
    invite: 'config/email-template.json',
    welcome: 'config/welcome-template.json'
};

// Resend config — EMAIL_FROM/EMAIL_FROM_NAME canonical, GMAIL_* fallback for back-compat
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.GMAIL_FROM_EMAIL || 'hello@my-yara.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || process.env.GMAIL_FROM_NAME || 'Yara';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    let body;
    try { body = JSON.parse(event.body); } catch {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'Invalid JSON' }) };
    }

    const { adminEmail, adminPassword, toEmail } = body;
    const templateType = (body.templateType === 'welcome') ? 'welcome' : 'invite';
    const templateFile = TEMPLATE_FILES[templateType];

    // Authenticate admin
    if (!AUTH_CREDENTIALS) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Auth not configured' }) };
    }
    const credentials = JSON.parse(AUTH_CREDENTIALS);
    const hashedPassword = crypto.createHash('sha256').update(adminPassword || '').digest('hex');
    if (!credentials[adminEmail] || credentials[adminEmail] !== hashedPassword) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    if (!toEmail) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'toEmail is required' }) };
    }

    if (!process.env.RESEND_API_KEY) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Email service not configured (RESEND_API_KEY missing)' }) };
    }

    // Load template from GitHub (falls back to default if not found)
    let subject, htmlTemplate;
    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${templateFile}?ref=main`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            }
        });
        if (res.ok) {
            const file = await res.json();
            const tpl = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
            subject = tpl.subject;
            htmlTemplate = tpl.html;
        }
    } catch (e) {
        console.log('Template load failed, using fallback:', e.message);
    }

    if (!subject) {
        subject = templateType === 'welcome'
            ? "Thanks for joining the Yara waitlist"
            : "You're approved for Yara Early Access";
    }
    if (!htmlTemplate) htmlTemplate = buildDefaultHtml(templateType);

    // Substitute variables
    const firstName = toEmail.split('@')[0].replace(/[._+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const html = htmlTemplate
        .replace(/\{\{email\}\}/g, escapeHtml(toEmail))
        .replace(/\{\{firstName\}\}/g, escapeHtml(firstName))
        .replace(/\{\{appStoreLink\}\}/g, UNLISTED_APP_STORE_LINK);

    // Send via Resend
    try {
        await sendViaResend(toEmail, subject, html);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Email sent', to: toEmail, templateType })
        };
    } catch (err) {
        console.error('send-email Resend error:', err);
        return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ message: 'Email delivery failed', details: err.message }) };
    }
};

// ── Resend helper ─────────────────────────────────────────────────────────────
async function sendViaResend(toEmail, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
            to: toEmail,
            subject,
            html
        })
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown');
        throw new Error(`Resend ${res.status}: ${errText}`);
    }
    return await res.json().catch(() => ({}));
}

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDefaultHtml(templateType) {
    if (templateType === 'welcome') {
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FDFCFF;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:16px;"><img src="https://www.my-yara.com/yara_butterfly.png" alt="Yara" width="40" height="40" style="width:40px;height:40px;" /></div>
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1A1A2E;font-size:26px;font-weight:800;margin:0;letter-spacing:-0.03em;">You're on the list.</h1>
      <p style="color:#4A4A68;font-size:15px;margin:10px 0 0;font-weight:400;">Welcome.</p>
    </div>
    <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.07);border-radius:20px;padding:24px;margin-bottom:20px;">
      <p style="color:#4A4A68;font-size:15px;line-height:1.65;margin:0 0 14px;">Thanks for signing up. We're glad you're here.</p>
      <p style="color:#4A4A68;font-size:14px;line-height:1.65;margin:0;">Yara is an AI advocate that fights to save you money. She analyzes your bills, finds overcharges and better deals, then takes action: negotiating with providers, switching plans, and cancelling services you don't need. No more sitting on hold.</p>
    </div>
    <div style="background:linear-gradient(135deg,rgba(108,58,237,0.08),rgba(167,139,250,0.05));border:1px solid rgba(108,58,237,0.2);border-radius:20px;padding:24px;margin-bottom:20px;text-align:center;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.1em;">A thank-you for joining early</p>
      <p style="color:#1A1A2E;font-size:20px;font-weight:800;margin:0 0 10px;line-height:1.3;letter-spacing:-0.02em;">6 months of Yara, free on us</p>
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0;">No card up front. No fine print. Yours when we open your spot.</p>
    </div>
    <div style="color:#4A4A68;font-size:14px;line-height:1.65;margin-bottom:20px;padding:0 4px;">
      <p style="margin:0;">We're letting people in carefully so Yara can give every early member real attention. We don't have a fixed date yet, but when your invite arrives, you'll get a private App Store link and be up and running in minutes.</p>
    </div>
    <div style="background:rgba(108,58,237,0.05);border:1px solid rgba(108,58,237,0.12);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#6C3AED;font-size:11px;font-weight:700;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.1em;">One small favor</p>
      <p style="color:#4A4A68;font-size:13px;line-height:1.6;margin:0;">Add <strong style="color:#1A1A2E;">hello@my-yara.com</strong> to your contacts so our invite lands in your inbox, not spam.</p>
    </div>
    <div style="text-align:center;padding-top:8px;">
      <p style="color:#8888A4;font-size:13px;line-height:1.6;margin:0 0 6px;">Questions? Just reply. We read every message.</p>
      <p style="color:#8888A4;font-size:13px;margin:0;">- The Yara team</p>
    </div>
    <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid rgba(0,0,0,0.06);">
      <p style="color:rgba(26,26,46,0.3);font-size:11px;margin:0;">Yara | Optimize Every Dollar. Protect Every Right.<br><a href="https://my-yara.com" style="color:#6C3AED;text-decoration:none;">my-yara.com</a></p>
    </div>
  </div>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FDFCFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:16px;"><img src="https://www.my-yara.com/yara_butterfly.png" alt="Yara" width="40" height="40" style="width:40px;height:40px;" /></div>
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#1A1A2E;font-size:24px;font-weight:700;margin:0;">Welcome to Yara</h1>
      <p style="color:#8888A4;font-size:14px;margin:8px 0 0;">You're in. Early access is yours.</p>
    </div>
    <div style="background:rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#1A1A2E;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Your early access request has been approved. Download Yara from the App Store now.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{appStoreLink}}" style="display:inline-block;background:linear-gradient(135deg,#6C3AED,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:600;">
          Download Yara
        </a>
      </div>
    </div>
    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(0,0,0,0.06);">
      <p style="color:rgba(26,26,46,0.3);font-size:11px;margin:0;">
        Yara | Your Personal AI Advocate &bull;
        <a href="https://my-yara.com" style="color:#6C3AED;text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
