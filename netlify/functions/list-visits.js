// list-visits.js - Lists and decrypts visitor analytics for the admin dashboard

const fetch = require('node-fetch');
const crypto = require('crypto');

const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
const ALGORITHM = 'aes-256-cbc';

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

    let requestData;
    try {
        requestData = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, headers: corsHeaders, body: 'Invalid JSON' };
    }

    // Authenticate admin
    const { email, password } = requestData;
    if (!AUTH_CREDENTIALS) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'Auth not configured' }) };
    }

    const credentials = JSON.parse(AUTH_CREDENTIALS);
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    if (!credentials[email] || credentials[email] !== hashedPassword) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ message: 'Unauthorized' }) };
    }

    try {
        // Fetch visits directory listing
        const githubApiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/visits`;
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
        const allVisits = [];

        // Decrypt each daily file
        const decryptPromises = files
            .filter(file => file.name.endsWith('.jsonl.encrypted'))
            .map(async (file) => {
                const fileRes = await fetch(file.download_url, {
                    headers: { 'Authorization': `token ${GITHUB_PAT}` }
                });
                const content = await fileRes.text();

                // Each line is a separately encrypted visit
                const lines = content.split('\n').filter(l => l.trim());
                const visits = [];
                for (const line of lines) {
                    try {
                        const decrypted = decryptData(line.trim(), ENCRYPTION_KEY);
                        visits.push(JSON.parse(decrypted));
                    } catch (e) {
                        // Skip corrupted entries
                    }
                }
                return visits;
            });

        const results = await Promise.all(decryptPromises);
        results.forEach(visits => allVisits.push(...visits));

        // Sort by timestamp descending
        allVisits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(allVisits)
        };

    } catch (error) {
        console.error('Error listing visits:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Internal error', error: error.message })
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
