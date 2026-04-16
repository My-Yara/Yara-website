// send-email.js — Sends a custom email to a waitlist invitee using the stored template + Gmail API
// Supports two templates via `templateType` body field: 'invite' (default) and 'welcome'.

const fetch = require('node-fetch');
const crypto = require('crypto');
const { google } = require('googleapis');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
const UNLISTED_APP_STORE_LINK = process.env.UNLISTED_APP_STORE_LINK || 'https://apps.apple.com/app/yara/id000000000';

const TEMPLATE_FILES = {
    invite: 'config/email-template.json',
    welcome: 'config/welcome-template.json'
};

// Gmail API config
const GMAIL_FROM_EMAIL = process.env.GMAIL_FROM_EMAIL || 'hello@my-yara.com';
const GMAIL_FROM_NAME  = process.env.GMAIL_FROM_NAME  || 'Yara';

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

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Email service not configured (GOOGLE_SERVICE_ACCOUNT_JSON missing)' }) };
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

    // Send via Gmail API
    try {
        await sendViaGmail(toEmail, subject, html);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Email sent', to: toEmail, templateType })
        };
    } catch (err) {
        console.error('send-email Gmail error:', err);
        return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ message: 'Email delivery failed', details: err.message }) };
    }
};

// ── Gmail API helper ──────────────────────────────────────────────────────────
async function sendViaGmail(toEmail, subject, html) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.JWT({
        email: serviceAccount.client_email,
        key:   serviceAccount.private_key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: GMAIL_FROM_EMAIL  // impersonate this Workspace user
    });

    const gmail = google.gmail({ version: 'v1', auth });

    // RFC 2822 message — encode subject for non-ASCII safety
    const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const message = [
        `From: ${GMAIL_FROM_NAME} <${GMAIL_FROM_EMAIL}>`,
        `To: ${toEmail}`,
        `Subject: ${encodedSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(html).toString('base64')
    ].join('\r\n');

    // base64url encode the full RFC 2822 message
    const raw = Buffer.from(message).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
    });
}

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDefaultHtml(templateType) {
    if (templateType === 'welcome') {
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:26px;font-weight:700;margin:0;letter-spacing:-0.02em;">You're on the list</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:15px;margin:10px 0 0;">Welcome to Yara, {{firstName}}.</p>
    </div>
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.85);font-size:15px;line-height:1.65;margin:0 0 14px;">
        Thanks for signing up — we're so glad you're here.
      </p>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.65;margin:0;">
        Yara is your personal AI advocate for your finances. We're letting people in carefully so we can give every early member real attention. We'll email you the moment your spot opens up.
      </p>
    </div>
    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <p style="color:#a78bfa;font-size:12px;font-weight:600;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.04em;">One small favor</p>
      <p style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.6;margin:0;">
        Add <strong style="color:rgba(255,255,255,0.9);">hello@my-yara.com</strong> to your contacts so our invite email lands in your inbox, not spam.
      </p>
    </div>
    <div style="text-align:center;padding-top:8px;">
      <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;margin:0 0 6px;">Questions? Just reply to this email.</p>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">— The Yara team</p>
    </div>
    <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
        Yara — Your Personal AI Advocate &bull;
        <a href="https://my-yara.com" style="color:rgba(139,92,246,0.6);text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0;">Welcome to Yara</h1>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:8px 0 0;">You're in. Early access is yours.</p>
    </div>
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;margin:0 0 16px;">
        Your early access request has been approved. Download Yara from the App Store now.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{appStoreLink}}" style="display:inline-block;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;">
          Download Yara
        </a>
      </div>
    </div>
    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
        Yara — Your Personal AI Advocate &bull;
        <a href="https://my-yara.com" style="color:rgba(139,92,246,0.6);text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
