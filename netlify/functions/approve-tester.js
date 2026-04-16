// approve-tester.js - Approves a waitlist user and sends email with unlisted App Store link

const fetch = require('node-fetch');
const crypto = require('crypto');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Email config — Resend
const UNLISTED_APP_STORE_LINK = process.env.UNLISTED_APP_STORE_LINK || 'https://apps.apple.com/app/yara/id000000000'; // placeholder until YARA-833
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.GMAIL_FROM_EMAIL || 'hello@my-yara.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || process.env.GMAIL_FROM_NAME || 'Yara';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    let requestData;
    try {
        requestData = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, headers: corsHeaders, body: 'Invalid JSON' };
    }

    const { adminEmail, adminPassword, userEmail, filename, sha } = requestData;

    // 1. Authenticate admin
    if (!AUTH_CREDENTIALS) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Auth not configured' }) };
    }

    const credentials = JSON.parse(AUTH_CREDENTIALS);
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');

    if (!credentials[adminEmail] || credentials[adminEmail] !== hashedPassword) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    try {
        // 2. Update status in GitHub
        const filePath = filename.includes('/') ? filename : `early-access/${filename}`;
        const githubUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filePath}`;

        const githubGetResponse = await fetch(githubUrl, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            }
        });

        if (githubGetResponse.ok) {
            const fileData = await githubGetResponse.json();
            const encryptedContent = Buffer.from(fileData.content, 'base64').toString();

            const decrypted = decryptData(encryptedContent, ENCRYPTION_KEY);
            const data = JSON.parse(decrypted);

            // Mark as approved
            data.status = 'approved';
            data.approvedAt = new Date().toISOString();
            data.approvedBy = adminEmail;

            // Re-encrypt and save
            const newEncrypted = encryptData(JSON.stringify(data), ENCRYPTION_KEY);
            const contentEncoded = Buffer.from(newEncrypted).toString('base64');

            await fetch(githubUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_PAT}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Netlify-Function-Yara-App'
                },
                body: JSON.stringify({
                    message: `Approved beta tester: ${userEmail}`,
                    content: contentEncoded,
                    sha: fileData.sha,
                    branch: 'main'
                })
            });
        }

        // 3. Send approval email with App Store link
        let emailSent = false;
        if (process.env.RESEND_API_KEY) {
            emailSent = await sendApprovalEmail(userEmail);
        } else {
            console.log('RESEND_API_KEY not configured — skipping email');
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Tester approved successfully',
                email: userEmail,
                emailSent: emailSent
            })
        };

    } catch (error) {
        console.error('Approval error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message })
        };
    }
};

async function sendApprovalEmail(toEmail) {
    try {
        const subject = "You're approved for Yara Early Access";
        const html = buildApprovalEmailHtml(toEmail);
        await sendViaResend(toEmail, subject, html);
        return true;
    } catch (err) {
        console.error('Email send error:', err.message);
        return false;
    }
}

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
}

function buildApprovalEmailHtml(email) {
    return `
<!DOCTYPE html>
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
        Your early access request has been approved. You can now download Yara directly from the App Store.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${UNLISTED_APP_STORE_LINK}" style="display:inline-block;background:linear-gradient(135deg,#8B5CF6,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;">
          Download Yara
        </a>
      </div>

      <p style="color:rgba(255,255,255,0.5);font-size:13px;line-height:1.5;margin:16px 0 0;">
        Open this link on your iPhone to install. The app is available exclusively to early access members like you.
      </p>
    </div>

    <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="color:#8B5CF6;font-size:13px;font-weight:600;margin:0 0 8px;">Getting started</p>
      <ul style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.8;margin:0;padding:0 0 0 18px;">
        <li>Open Yara and sign in with <strong style="color:rgba(255,255,255,0.8);">${email}</strong></li>
        <li>Connect a bank account to unlock financial insights</li>
        <li>Ask Yara anything about your bills, subscriptions, or spending</li>
        <li>Share feedback directly in the app — we read every message</li>
      </ul>
    </div>

    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
        Yara — Your Personal AI Advocate<br>
        <a href="https://my-yara.com" style="color:rgba(139,92,246,0.6);text-decoration:none;">my-yara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

function encryptData(text, secret) {
    const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}

function decryptData(encryptedText, secret) {
    const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
    const iv = Buffer.from(encryptedText.substr(0, 32), 'hex');
    const encrypted = encryptedText.substr(32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
