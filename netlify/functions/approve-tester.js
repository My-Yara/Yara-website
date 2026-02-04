// approve-tester.js - Approves a waitlist user and adds to TestFlight via App Store Connect API

const fetch = require('node-fetch');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// --- Configuration ---
const GITHUB_PAT = process.env.GITHUB_PAT_TOKEN;
const DATA_REPO = process.env.GITHUB_DATA_REPO;
const GITHUB_ORG = 'My-Yara';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// App Store Connect Config
const ASC_ISSUER_ID = process.env.ASC_ISSUER_ID;
const ASC_KEY_ID = process.env.ASC_KEY_ID;
const ASC_PRIVATE_KEY = process.env.ASC_PRIVATE_KEY?.replace(/
/g, '
');
const ASC_BETA_GROUP_ID = process.env.ASC_BETA_GROUP_ID;

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

    if (!ASC_PRIVATE_KEY || !ASC_ISSUER_ID || !ASC_KEY_ID || !ASC_BETA_GROUP_ID) {
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ message: 'App Store Connect not configured' }) };
    }

    try {
        // 2. Add to App Store Connect
        const token = generateASCToken();
        
        const ascResponse = await fetch('https://api.appstoreconnect.apple.com/v1/betaTesters', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    type: 'betaTesters',
                    attributes: {
                        email: userEmail,
                        firstName: 'Yara', // Default names if not provided
                        lastName: 'Beta'
                    },
                    relationships: {
                        betaGroups: {
                            data: [{
                                type: 'betaGroups',
                                id: ASC_BETA_GROUP_ID
                            }]
                        }
                    }
                }
            })
        });

        const ascResult = await ascResponse.json();

        if (!ascResponse.ok) {
            // If already exists (409), that's fine, we still want to mark as approved in our DB
            if (ascResponse.status !== 409) {
                console.error('App Store Connect API Error:', ascResult);
                return {
                    statusCode: ascResponse.status,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Apple API Error', details: ascResult })
                };
            }
        }

        // 3. Update status in GitHub
        // Fetch current content to ensure we have the latest data
        const getFileUrl = `https://api.appstoreconnect.apple.com/v1/betaTesters`; // Placeholder, we actually use filename from request
        const githubUrl = `https://api.github.com/repos/${GITHUB_ORG}/${DATA_REPO}/contents/${filename}`;
        
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

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Tester approved successfully', email: userEmail })
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

function generateASCToken() {
    const payload = {
        iss: ASC_ISSUER_ID,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 mins
        aud: 'appstoreconnect-v1'
    };

    return jwt.sign(payload, ASC_PRIVATE_KEY, {
        algorithm: 'ES256',
        header: {
            alg: 'ES256',
            kid: ASC_KEY_ID,
            typ: 'JWT'
        }
    });
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
