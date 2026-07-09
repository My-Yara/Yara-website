// list-waitlist.js - Lists and decrypts early access signups for admins

const fetch = require('node-fetch');
const crypto = require('crypto');
const { verifySessionToken } = require('./lib/verify-session');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

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

    // 1. Authenticate admin — YARA-3551: verify the session token issued by
    // authenticate.js instead of re-checking a replayed password.
    const session = verifySessionToken(event.headers.authorization || event.headers.Authorization);
    if (!session) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    // 2. Fetch file list from GitHub
    try {
        const githubApiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/early-access`;
        const response = await fetch(githubApiUrl, {
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'User-Agent': 'Netlify-Function-Yara-App',
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { statusCode: 200, headers: corsHeaders, body: JSON.stringify([]) };
            }
            throw new Error(`GitHub API Error: ${response.statusText}`);
        }

        const files = await response.json();
        const waitlistEntries = [];

        // 3. Fetch and decrypt each file
        // Note: For production with many files, we should use a database or optimize this.
        const decryptPromises = files
            .filter(file => file.name.endsWith('.encrypted'))
            .map(async (file) => {
                const fileResponse = await fetch(file.download_url, {
                    headers: { 'Authorization': `token ${GITHUB_PAT}` }
                });
                const encryptedContent = await fileResponse.text();
                
                try {
                    const decrypted = decryptData(encryptedContent, ENCRYPTION_KEY);
                    const data = JSON.parse(decrypted);
                    data.filename = file.name;
                    data.sha = file.sha; // Useful for updating later
                    return data;
                } catch (e) {
                    console.error(`Failed to decrypt file ${file.name}:`, e);
                    return null;
                }
            });

        const results = await Promise.all(decryptPromises);
        const validEntries = results.filter(entry => entry !== null);

        // Resolve locations for entries with unknown/missing location but valid IP
        const needsGeo = validEntries.filter(e =>
            e.ipAddress && e.ipAddress !== 'unknown' &&
            (!e.location || e.location.includes('Unknown'))
        );

        if (needsGeo.length > 0) {
            // Batch lookup: ipapi.co supports up to ~30 req/min on free tier
            // Use ip-api.com batch endpoint for bulk lookups (free, up to 100 per request)
            const ips = [...new Set(needsGeo.map(e => e.ipAddress))];
            const ipToLocation = {};

            try {
                const batchRes = await fetch('http://ip-api.com/batch?fields=query,city,regionName,country,status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ips.map(ip => ({ query: ip })))
                });
                if (batchRes.ok) {
                    const batchData = await batchRes.json();
                    batchData.forEach(r => {
                        if (r.status === 'success') {
                            ipToLocation[r.query] = `${r.city || 'Unknown'}, ${r.regionName || 'Unknown'}, ${r.country || 'Unknown'}`;
                        }
                    });
                }
            } catch (geoErr) {
                console.log('Batch geo lookup failed:', geoErr.message);
            }

            // Apply resolved locations
            needsGeo.forEach(entry => {
                if (ipToLocation[entry.ipAddress]) {
                    entry.location = ipToLocation[entry.ipAddress];
                }
            });
        }

        // Sort by timestamp descending
        validEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(validEntries)
        };

    } catch (error) {
        console.error('Error listing waitlist:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message })
        };
    }
};

function decryptData(encryptedText, secret) {
    const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
    const iv = Buffer.from(encryptedText.substr(0, 32), 'hex');
    const encrypted = encryptedText.substr(32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
