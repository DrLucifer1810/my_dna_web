let networkData = [];
let currentIntentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize icons
    feather.replace();
    
    // Theme setup
    setupTheme();
    
    // Fetch data
    fetchData();
    setupFilters();
});

function setupTheme() {
    const toggleBtn = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const htmlEl = document.documentElement;

    // Check localStorage
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        htmlEl.classList.add('dark');
        themeIcon.setAttribute('data-feather', 'sun');
    } else {
        htmlEl.classList.remove('dark');
        themeIcon.setAttribute('data-feather', 'moon');
    }
    feather.replace();

    toggleBtn.addEventListener('click', () => {
        if (htmlEl.classList.contains('dark')) {
            htmlEl.classList.remove('dark');
            localStorage.theme = 'light';
            themeIcon.setAttribute('data-feather', 'moon');
        } else {
            htmlEl.classList.add('dark');
            localStorage.theme = 'dark';
            themeIcon.setAttribute('data-feather', 'sun');
        }
        feather.replace();
    });
}

// Generate simple SVG identicon based on string seed
function generateAvatar(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate colors
    const c1 = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
    const c2 = `hsl(${Math.abs(hash * 2) % 360}, 70%, 40%)`;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
            <linearGradient id="grad${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${c1};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${c2};stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grad${Math.abs(hash)})" />
        <circle cx="50" cy="50" r="${30 + (Math.abs(hash)%15)}" fill="#ffffff" opacity="0.2" />
        <circle cx="${20 + (Math.abs(hash)%60)}" cy="${20 + (Math.abs(hash)%60)}" r="${10 + (Math.abs(hash)%10)}" fill="#ffffff" opacity="0.3" />
    </svg>`;
    
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function fetchData() {
    try {
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
        filterData(); // Initial render
    } catch (e) {
        document.getElementById('nodesListContainer').innerHTML = `<div class="p-8 text-center text-red-500">Failed to load data. Is global_stats.json available?</div>`;
    }
}

function renderGlobalSkills() {
    const skillCounts = {};
    networkData.forEach(node => {
        let skills = [];
        if (node.top_skills) {
            if (Array.isArray(node.top_skills)) skills = node.top_skills;
            else skills = node.top_skills.split(',').map(s => s.trim());
        }
        if(node.matching_profile && node.matching_profile.tech_stack) {
            node.matching_profile.tech_stack.forEach(s => skills.push(s.name));
        }

        skills.forEach(skill => {
            if (!skill) return;
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
    });

    const sortedSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

    const container = document.getElementById('skillsRankingContainer');
    container.innerHTML = '';
    
    if(sortedSkills.length === 0) {
        container.innerHTML = '<div class="text-sm text-gray-500">No data</div>';
        return;
    }

    const maxCount = sortedSkills[0][1];

    sortedSkills.forEach(([skill, count]) => {
        const percent = (count / maxCount) * 100;
        const row = document.createElement('div');
        row.innerHTML = `
            <div class="flex justify-between text-xs mb-1">
                <span class="font-medium text-gray-700 dark:text-zinc-300">${skill}</span>
                <span class="text-gray-500">${count}</span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                <div class="bg-brand-500 h-1.5 rounded-full" style="width: ${percent}%"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderNodes(nodes) {
    const container = document.getElementById('nodesListContainer');
    container.innerHTML = '';

    if (nodes.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-500 text-sm">No nodes match your filters.</div>`;
        return;
    }

    nodes.forEach((node, index) => {
        const row = document.createElement('div');
        row.className = "grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-default";
        
        const shortKey = node.public_key ? `${node.public_key.substring(0, 8)}...${node.public_key.substring(node.public_key.length - 4)}` : 'Unknown';
        const avatarUrl = generateAvatar(node.public_key || Math.random().toString());
        
        // Format Salary
        let salaryText = 'N/A';
        if(node.salary_expectation && node.salary_expectation > 0) {
            salaryText = `$${(node.salary_expectation/1000).toFixed(0)}k`;
        } else if (node.matching_profile && node.matching_profile.min_salary) {
            salaryText = `$${(node.matching_profile.min_salary/1000).toFixed(0)}k`;
        }

        // Format Skills
        let skillsArr = [];
        if(node.matching_profile && node.matching_profile.tech_stack) {
            skillsArr = node.matching_profile.tech_stack.slice(0,3).map(s => s.name);
        } else if(node.top_skills) {
            skillsArr = (Array.isArray(node.top_skills) ? node.top_skills : node.top_skills.split(',')).slice(0,3);
        }
        
        let skillsHtml = skillsArr.map(s => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">${s}</span>`).join(' ');
        if(skillsArr.length === 0) skillsHtml = '<span class="text-xs text-gray-400">Not specified</span>';

        // Rank Badge
        let rankHtml = `<span class="text-gray-400 font-medium">${index + 1}</span>`;
        if (index === 0) rankHtml = `<i data-feather="award" class="w-5 h-5 text-yellow-500 mx-auto"></i>`;
        else if (index === 1) rankHtml = `<i data-feather="award" class="w-5 h-5 text-gray-400 mx-auto"></i>`;
        else if (index === 2) rankHtml = `<i data-feather="award" class="w-5 h-5 text-amber-700 mx-auto"></i>`;

        row.innerHTML = `
            <div class="col-span-1 text-center">
                ${rankHtml}
            </div>
            <div class="col-span-4 flex items-center gap-3">
                <img src="${avatarUrl}" class="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-700 shadow-sm" alt="Avatar">
                <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                        ${shortKey}
                        ${node.intent === 'Ứng viên' ? '<span class="w-2 h-2 rounded-full bg-blue-500" title="Candidate"></span>' : ''}
                        ${node.intent === 'Nhà tuyển dụng' ? '<span class="w-2 h-2 rounded-full bg-emerald-500" title="Employer"></span>' : ''}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-zinc-400">${node.seniority || 'Unspecified Level'} • ${node.work_model || 'Remote'}</div>
                </div>
            </div>
            <div class="col-span-4 flex flex-wrap gap-1 items-center">
                ${skillsHtml}
            </div>
            <div class="col-span-3 text-right">
                <div class="text-sm font-semibold text-gray-700 dark:text-zinc-300">${salaryText}</div>
            </div>
        `;

        container.appendChild(row);
    });
    feather.replace();
}

function filterData() {
    const searchInput = document.getElementById('searchInput');
    const workModelFilter = document.getElementById('workModelFilter');
    
    const q = searchInput.value.toLowerCase();
    const model = workModelFilter.value;

    const filtered = networkData.filter(node => {
        let matchesQuery = true;
        if (q) {
            const keyMatch = node.public_key && node.public_key.toLowerCase().includes(q);
            let skillStr = '';
            if(node.top_skills) skillStr += (Array.isArray(node.top_skills) ? node.top_skills.join(',') : node.top_skills).toLowerCase();
            if(node.matching_profile) skillStr += JSON.stringify(node.matching_profile).toLowerCase();
            matchesQuery = keyMatch || skillStr.includes(q);
        }

        const matchesIntent = currentIntentFilter === 'all' || node.intent === currentIntentFilter;
        const matchesModel = model === 'all' || node.work_model === model;

        return matchesQuery && matchesIntent && matchesModel;
    });

    renderNodes(filtered);
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const workModelFilter = document.getElementById('workModelFilter');
    const tabBtns = document.querySelectorAll('.tab-btn');

    searchInput.addEventListener('input', filterData);
    workModelFilter.addEventListener('change', filterData);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset tabs
            tabBtns.forEach(b => {
                b.classList.remove('border-brand-500', 'text-brand-600', 'dark:text-brand-500');
                b.classList.add('border-transparent', 'text-gray-500', 'dark:text-zinc-400');
            });
            
            // Activate current
            const target = e.currentTarget;
            target.classList.remove('border-transparent', 'text-gray-500', 'dark:text-zinc-400');
            target.classList.add('border-brand-500', 'text-brand-600', 'dark:text-brand-500');
            
            currentIntentFilter = target.getAttribute('data-filter');
            filterData();
        });
    });
}
