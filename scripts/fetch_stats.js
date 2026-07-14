const fs = require('fs');
const https = require('https');
const path = require('path');

// URL of the Google Apps Script Web App (from Github Secrets)
const GAS_URL = process.env.GAS_WEBHOOK_URL;

if (!GAS_URL) {
    console.error("Missing GAS_WEBHOOK_URL in environment.");
    process.exit(1);
}

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const outputPath = path.join(publicDir, 'global_stats.json');

console.log(`Fetching latest network stats from GAS...`);

https.get(GAS_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
            console.log(`Successfully updated ${outputPath}`);
            console.log(`Total nodes fetched: ${json.total_nodes}`);
        } catch (e) {
            console.error("Error parsing response:", e.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error("HTTP GET Error:", err.message);
    process.exit(1);
});
