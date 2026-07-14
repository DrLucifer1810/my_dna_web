const fs = require('fs');
const path = require('path');
const https = require('https');

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const CHUNK_SIZE = 50;

if (!WEBHOOK_URL) {
    console.error("Error: WEBHOOK_URL environment variable is missing.");
    process.exit(1);
}

function fetchStats(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            // Handle redirects (Apps Script often redirects to script.googleusercontent.com)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchStats(res.headers.location));
            }
            
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log("Fetching raw stats from Webhook...");
    const rawData = await fetchStats(WEBHOOK_URL);
    
    const nodes = rawData.nodes || [];
    const totalNodes = nodes.length;
    
    console.log(`Received ${totalNodes} nodes. Processing...`);

    // 1. Calculate Top Skills
    const skillCounts = {};
    nodes.forEach(node => {
        let skills = [];
        if (node.top_skills) {
            skills = Array.isArray(node.top_skills) ? node.top_skills : node.top_skills.split(',').map(s => s.trim());
        }
        if (node.matching_profile && node.matching_profile.tech_stack) {
            node.matching_profile.tech_stack.forEach(s => skills.push(s.name));
        }

        skills.forEach(skill => {
            if (!skill) return;
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
    });

    const sortedSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10

    // Prepare Output Directories
    const publicDir = path.join(__dirname, '../public');
    const chunksDir = path.join(publicDir, 'chunks');
    if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
    fs.mkdirSync(publicDir, { recursive: true });
    fs.mkdirSync(chunksDir, { recursive: true });

    // 2. Generate Summary
    const summary = {
        updated_at: new Date().toISOString(),
        total_nodes: totalNodes,
        top_skills: sortedSkills,
        total_chunks: Math.ceil(totalNodes / CHUNK_SIZE)
    };
    fs.writeFileSync(path.join(publicDir, 'summary.json'), JSON.stringify(summary));
    console.log(`Generated summary.json`);

    // 3. Generate Chunks & Index
    const searchIndex = [];
    
    for (let i = 0; i < totalNodes; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        const chunkNodes = nodes.slice(i, i + CHUNK_SIZE);
        
        fs.writeFileSync(path.join(chunksDir, `chunk_${chunkIndex}.json`), JSON.stringify(chunkNodes));
        
        // Build Index for this chunk
        chunkNodes.forEach(node => {
            let skillStr = "";
            if (node.top_skills) skillStr += Array.isArray(node.top_skills) ? node.top_skills.join(',') : node.top_skills;
            if (node.matching_profile) skillStr += JSON.stringify(node.matching_profile);
            
            searchIndex.push({
                k: node.public_key, // pubKey
                c: chunkIndex,      // chunk id
                i: node.intent || '',
                m: node.work_model || '',
                s: skillStr.toLowerCase() // searchable string
            });
        });
    }

    fs.writeFileSync(path.join(publicDir, 'search_index.json'), JSON.stringify(searchIndex));
    console.log(`Generated ${summary.total_chunks} chunks and search_index.json`);
    console.log("Build complete.");
}

run().catch(console.error);
