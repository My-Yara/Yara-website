// send-email.js — Sends a custom email to a waitlist invitee using the stored template

const fetch = require('node-fetch');
const crypto = require('crypto');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Yara <hello@my-yara.com>';
const UNLISTED_APP_STORE_LINK = process.env.UNLISTED_APP_STORE_LINK || 'https://apps.apple.com/app/yara/id000000000';

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

    if (!RESEND_API_KEY) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Email service not configured (RESEND_API_KEY missing)' }) };
    }

    // Load template from GitHub (falls back to default if not found)
    let subject, htmlTemplate;
    try {
        const url = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/config/email-template.json?ref=main`;
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

    // Default subject/body if no saved template
    if (!subject) subject = "You're approved for Yara Early Access";
    if (!htmlTemplate) {
        htmlTemplate = buildDefaultHtml();
    }

    // Substitute variables: {{email}}, {{appStoreLink}}
    const firstName = toEmail.split('@')[0].replace(/[._+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const html = htmlTemplate
        .replace(/\{\{email\}\}/g, escapeHtml(toEmail))
        .replace(/\{\{firstName\}\}/g, escapeHtml(firstName))
        .replace(/\{\{appStoreLink\}\}/g, UNLISTED_APP_STORE_LINK);

    // Send via Resend
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from: EMAIL_FROM, to: [toEmail], subject, html })
        });

        if (!res.ok) {
            const err = await res.json();
            console.error('Resend error:', err);
            return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ message: 'Email delivery failed', details: err }) };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Email sent', to: toEmail })
        };

    } catch (err) {
        console.error('send-email error:', err);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: err.message }) };
    }
};

function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDefaultHtml() {
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
