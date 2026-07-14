let networkData = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupFilters();
    setupModal();
});

async function fetchData() {
    try {
        // Fallback for local testing or Github Pages path
        const res = await fetch('public/global_stats.json');
        if (!res.ok) throw new Error("Failed to load JSON");
        const json = await res.json();
        
        document.getElementById('totalNodesCount').textContent = json.total_nodes;
        if(json.updated_at) {
            const date = new Date(json.updated_at);
            document.getElementById('lastSyncTime').textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        networkData = json.nodes;
        renderGlobalSkills();
        renderNodes(networkData);
    } catch (e) {
        document.getElementById('nodesListContainer').innerHTML = `<div class="loading-pulse" style="color: #ff4a4a;">Failed to load data. Is global_stats.json available?</div>`;
    }
}

function renderGlobalSkills() {
    const skillCounts = {};
    networkData.forEach(node => {
        // Handle node.top_skills string (comma separated) or array
        let skills = [];
        if (node.top_skills) {
            if (Array.isArray(node.top_skills)) skills = node.top_skills;
            else skills = node.top_skills.split(',').map(s => s.trim());
        }
        
        // Handle new struct with matching_profile
        if(node.matching_profile) {
            if(node.matching_profile.tech_stack) {
                node.matching_profile.tech_stack.forEach(s => skills.push(s.name));
            }
        }

        skills.forEach(skill => {
            if (!skill) return;
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
    });

    const sortedSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10

    const container = document.getElementById('skillsRankingContainer');
    container.innerHTML = '';

    const maxCount = sortedSkills.length > 0 ? sortedSkills[0][1] : 1;

    sortedSkills.forEach(([skill, count]) => {
        const percent = (count / maxCount) * 100;
        
        const row = document.createElement('div');
        row.className = 'skill-bar-row';
        row.innerHTML = `
            <div class="skill-header">
                <span>${skill}</span>
                <span class="skill-count">${count}</span>
            </div>
            <div class="skill-track">
                <div class="skill-fill" style="width: 0%"></div>
            </div>
        `;
        container.appendChild(row);

        // Animate bar
        setTimeout(() => {
            row.querySelector('.skill-fill').style.width = `${percent}%`;
        }, 100);
    });
}

function renderNodes(nodes) {
    const container = document.getElementById('nodesListContainer');
    container.innerHTML = '';

    if (nodes.length === 0) {
        container.innerHTML = `<div class="loading-pulse">No nodes match your filters.</div>`;
        return;
    }

    nodes.forEach((node, index) => {
        const card = document.createElement('div');
        card.className = `node-card ${index < 3 ? 'top-' + (index + 1) : ''}`;
        
        const shortKey = node.public_key ? `${node.public_key.substring(0, 6)}...${node.public_key.substring(node.public_key.length - 4)}` : 'Unknown';
        
        const avatarLetter = shortKey.substring(0,2).toUpperCase();

        card.innerHTML = `
            <div class="node-main-info">
                <div class="node-avatar">${avatarLetter}</div>
                <div>
                    <div class="node-pubkey">${shortKey}</div>
                    <div class="node-meta">${node.seniority || 'Unknown Level'}</div>
                </div>
            </div>
            <div class="node-tags">
                <span class="badge model">${node.work_model || 'Remote'}</span>
                <span class="badge intent">${node.intent || 'Unknown'}</span>
            </div>
        `;

        card.addEventListener('click', () => openModal(node));
        container.appendChild(card);
    });
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const intentFilter = document.getElementById('intentFilter');
    const workModelFilter = document.getElementById('workModelFilter');

    const filterData = () => {
        const q = searchInput.value.toLowerCase();
        const intent = intentFilter.value;
        const model = workModelFilter.value;

        const filtered = networkData.filter(node => {
            let matchesQuery = true;
            if (q) {
                const keyMatch = node.public_key && node.public_key.toLowerCase().includes(q);
                let skillStr = '';
                if(node.top_skills) skillStr += (Array.isArray(node.top_skills) ? node.top_skills.join(',') : node.top_skills).toLowerCase();
                if(node.matching_profile) {
                    skillStr += JSON.stringify(node.matching_profile).toLowerCase();
                }
                matchesQuery = keyMatch || skillStr.includes(q);
            }

            const matchesIntent = intent === 'all' || node.intent === intent;
            const matchesModel = model === 'all' || node.work_model === model;

            return matchesQuery && matchesIntent && matchesModel;
        });

        renderNodes(filtered);
    };

    searchInput.addEventListener('input', filterData);
    intentFilter.addEventListener('change', filterData);
    workModelFilter.addEventListener('change', filterData);
}

// Modal Logic
function setupModal() {
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('profileModal').addEventListener('click', (e) => {
        if(e.target === document.getElementById('profileModal')) closeModal();
    });
}

function openModal(node) {
    document.getElementById('modalPublicKey').textContent = node.public_key ? `${node.public_key.substring(0, 16)}...` : 'Unknown';
    document.getElementById('modalIntent').textContent = node.intent || 'Unknown';
    document.getElementById('modalSeniority').textContent = node.seniority || 'Unknown Level';
    document.getElementById('modalWorkModel').textContent = node.work_model || 'Remote';
    
    // Formatting Salary
    let salaryText = 'Negotiable / Optional';
    if(node.salary_expectation && node.salary_expectation > 0) {
        salaryText = `$${node.salary_expectation.toLocaleString()}`;
    } else if (node.matching_profile && node.matching_profile.min_salary) {
        salaryText = `$${node.matching_profile.min_salary.toLocaleString()}`;
    }
    document.getElementById('modalSalary').textContent = salaryText;

    // Skills
    const skillsContainer = document.getElementById('modalSkills');
    const domainContainer = document.getElementById('modalDomain');
    skillsContainer.innerHTML = '';
    domainContainer.innerHTML = '';

    let techArr = [];
    let domainArr = [];

    if(node.matching_profile) {
        if(node.matching_profile.tech_stack) techArr = node.matching_profile.tech_stack.map(s => s.name);
        if(node.matching_profile.domain_knowledge) domainArr = node.matching_profile.domain_knowledge.map(s => s.name);
    } else if(node.top_skills) {
        techArr = Array.isArray(node.top_skills) ? node.top_skills : node.top_skills.split(',');
    }

    if(techArr.length === 0) skillsContainer.innerHTML = '<span class="text-secondary">No specific skills listed</span>';
    else techArr.forEach(s => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.textContent = s.trim();
        skillsContainer.appendChild(span);
    });

    if(domainArr.length === 0) domainContainer.innerHTML = '<span class="text-secondary" style="color: var(--text-secondary); font-size: 13px;">Not specified</span>';
    else domainArr.forEach(s => {
        const span = document.createElement('span');
        span.className = 'skill-tag';
        span.textContent = s.trim();
        domainContainer.appendChild(span);
    });

    document.getElementById('profileModal').classList.add('active');
}

function closeModal() {
    document.getElementById('profileModal').classList.remove('active');
}
