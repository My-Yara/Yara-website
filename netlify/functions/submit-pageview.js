// submit-pageview.js - Stores visitor analytics (page views, time on page, traffic source)
// Data is appended to daily aggregate files in the GitHub repo under visits/

const fetch = require('node-fetch');
const crypto = require('crypto');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, headers: corsHeaders, body: 'Invalid JSON' };
    }

    // Validate required fields
    if (typeof data.duration !== 'number' || !data.timestamp) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'Missing required fields' }) };
    }

    // Capture server-side data
    const clientIp = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';

    const visit = {
        duration: Math.round(data.duration),       // seconds on page
        maxScroll: data.maxScroll || 0,             // max scroll depth percentage
        engaged: data.engaged || false,             // interacted with form
        converted: data.converted || false,         // completed signup
        source: sanitize(data.source || 'direct'),  // traffic source category
        referrer: sanitize(data.referrer || ''),     // raw referrer
        utmSource: sanitize(data.utmSource || ''),
        utmMedium: sanitize(data.utmMedium || ''),
        utmCampaign: sanitize(data.utmCampaign || ''),
        utmContent: sanitize(data.utmContent || ''),
        timestamp: data.timestamp,
        ip: clientIp,
        ua: (event.headers['user-agent'] || '').slice(0, 200),
    };

    // Encrypt visit data
    const plaintext = JSON.stringify(visit);
    const encrypted = encryptData(plaintext, ENCRYPTION_KEY);

    // Store as daily file: visits/2026-03-23.jsonl.encrypted
    // Each visit is a line in an encrypted JSONL file
    const dateKey = new Date().toISOString().slice(0, 10);
    const filename = `visits/${dateKey}.jsonl.encrypted`;
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filename}`;

    try {
        // Check if today's file exists
        const existingRes = await fetch(githubApiUrl, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'User-Agent': 'Netlify-Function-Yara-App',
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let content, sha;
        if (existingRes.ok) {
            // Append to existing file
            const existing = await existingRes.json();
            sha = existing.sha;
            const existingContent = Buffer.from(existing.content, 'base64').toString('utf8');
            content = existingContent + '\n' + encrypted;
        } else {
            // New file for today
            content = encrypted;
        }

        const commitData = {
            message: `Visit data ${dateKey}`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main',
        };
        if (sha) commitData.sha = sha;

        const putRes = await fetch(githubApiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            },
            body: JSON.stringify(commitData)
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            // 409 = conflict (concurrent write) — visit data is non-critical, acceptable to drop
            if (putRes.status === 409) {
                return { statusCode: 202, headers: corsHeaders, body: JSON.stringify({ message: 'Conflict, visit dropped' }) };
            }
            console.error('GitHub API Error:', err);
            return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Storage error' }) };
        }

        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: 'ok' }) };

    } catch (error) {
        console.error('Function error:', error);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Internal error' }) };
    }
};

function encryptData(text, secret) {
    const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}

function sanitize(str) {
    return String(str).slice(0, 500).replace(/[<>]/g, '');
}
