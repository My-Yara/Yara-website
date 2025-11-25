#!/usr/bin/env node
/**
 * Password Hash Generator for Yara Survey Authentication
 *
 * This script helps you generate hashed passwords for the AUTH_CREDENTIALS
 * environment variable in Netlify.
 *
 * Usage:
 *   node generate-credentials.js
 *
 * Then follow the prompts to add email/password pairs.
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
}

const credentials = {};

console.log('\n🔐 Yara Survey - Credential Generator\n');
console.log('This tool will help you create hashed credentials for executive access.\n');
console.log('Instructions:');
console.log('1. Enter email and password for each executive');
console.log('2. When done, copy the JSON output');
console.log('3. Add it to Netlify as AUTH_CREDENTIALS environment variable\n');
console.log('─'.repeat(60));

function promptForCredential() {
    rl.question('\nEnter email (or press Enter to finish): ', (email) => {
        if (!email || email.trim() === '') {
            // Finished adding credentials
            console.log('\n' + '─'.repeat(60));
            console.log('\n✅ Credentials generated! Copy the JSON below:\n');
            console.log(JSON.stringify(credentials, null, 2));
            console.log('\n📋 Instructions:');
            console.log('1. Copy the JSON above (including the curly braces)');
            console.log('2. Go to Netlify Dashboard → Your Site → Environment Variables');
            console.log('3. Add new variable:');
            console.log('   Name: AUTH_CREDENTIALS');
            console.log('   Value: [paste the JSON]');
            console.log('4. Deploy your site\n');
            rl.close();
            return;
        }

        rl.question('Enter password: ', (password) => {
            if (!password || password.trim() === '') {
                console.log('⚠️  Password cannot be empty. Try again.');
                promptForCredential();
                return;
            }

            const hashedPassword = hashPassword(password);
            credentials[email.trim()] = hashedPassword;

            console.log(`✓ Added: ${email.trim()}`);
            console.log(`  Password hash: ${hashedPassword.substring(0, 20)}...`);

            promptForCredential();
        });
    });
}

// Start the process
promptForCredential();
