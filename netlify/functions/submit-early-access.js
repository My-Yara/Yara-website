// submit-early-access.js - Saves early access questionnaire responses (ENCRYPTED)

const fetch = require('node-fetch');
const crypto = require('crypto');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES requires a 16-byte IV

// CORS headers to allow requests from the website
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: 'Method Not Allowed'
        };
    }

    let data;
    try {
        data = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: 'Invalid JSON format'
        };
    }

    // Validate required fields
    if (!data.email || !data.financialGoals || !data.rightsProtection || !data.idealOutcome) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Missing required fields' })
        };
    }

    // 1. Get client IP and location
    const clientIp = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';

    // Netlify provides geo data via context.geo (Pro+) or x-nf-geo header
    let city = 'Unknown', region = 'Unknown', country = 'Unknown';
    try {
        if (context && context.geo) {
            city = context.geo.city || 'Unknown';
            region = (context.geo.subdivision && context.geo.subdivision.name) || 'Unknown';
            country = (context.geo.country && context.geo.country.name) || 'Unknown';
        } else if (event.headers['x-nf-geo']) {
            const geo = JSON.parse(decodeURIComponent(event.headers['x-nf-geo']));
            city = geo.city || 'Unknown';
            region = geo.subdivision || geo.region || 'Unknown';
            country = geo.country || 'Unknown';
        }
    } catch (geoErr) {
        console.log('Geo lookup failed:', geoErr.message);
    }

    // Fallback: use free IP geolocation if still unknown
    if (city === 'Unknown' && clientIp !== 'unknown') {
        try {
            const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                city = geoData.city || 'Unknown';
                region = geoData.region || 'Unknown';
                country = geoData.country_name || 'Unknown';
            }
        } catch (e) { /* non-critical */ }
    }

    data.ipAddress = clientIp;
    data.location = `${city}, ${region}, ${country}`;

    // 2. Encrypt the response data before saving
    const plaintext = JSON.stringify(data);
    const encryptedContent = encryptData(plaintext, ENCRYPTION_KEY);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Save in early-access folder with .encrypted extension
    const filename = `early-access/${data.email.replace('@', '_at_')}_${timestamp}.encrypted`;

    // 2. Prepare GitHub API request
    const contentEncoded = Buffer.from(encryptedContent).toString('base64');
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filename}`;

    const commitData = {
        message: `New ENCRYPTED early access signup from ${data.email}`,
        content: contentEncoded,
        branch: 'main'
    };

    try {
        const response = await fetch(githubApiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_PAT}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Netlify-Function-Yara-App'
            },
            body: JSON.stringify(commitData)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('GitHub API Error:', errorBody);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Failed to save data to GitHub.', details: errorBody })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Early access response saved and encrypted successfully!',
                email: data.email
            })
        };

    } catch (error) {
        console.error('Function execution error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Serverless function execution failed.' })
        };
    }
};

/**
 * Encrypts plaintext data using AES-256-CBC.
 * The output includes the IV prepended to the ciphertext.
 */
function encryptData(text, secret) {
    const key = crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}
