document.addEventListener('DOMContentLoaded', () => {
    const leaderboardBody = document.getElementById('leaderboard-body');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResults = document.getElementById('no-results');
    
    // Filters
    const intentFilter = document.getElementById('intent-filter');
    const seniorityFilter = document.getElementById('seniority-filter');
    const skillSearch = document.getElementById('skill-search');
    const searchBtn = document.getElementById('search-btn');

    let networkData = [];

    // Lấy dữ liệu tĩnh public/global_stats.json (được GitHub Actions commit định kỳ)
    async function fetchStats() {
        try {
            // Trong production, url sẽ là đường dẫn tĩnh của GitHub Pages
            const response = await fetch('public/global_stats.json?t=' + new Date().getTime());
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            networkData = data.nodes;
            
            document.getElementById('stat-total-nodes').innerText = data.total_nodes;
            document.getElementById('stat-recruiters').innerText = networkData.filter(n => n.intent.includes("tuyển dụng")).length;
            document.getElementById('stat-freelancers').innerText = networkData.filter(n => n.intent.includes("Freelancer")).length;
            
            const dateObj = new Date(data.updated_at);
            document.getElementById('last-updated').innerText = `Last synced: ${dateObj.toLocaleString()}`;
            
            renderTable(networkData);
        } catch (error) {
            console.error("Error fetching stats:", error);
            document.getElementById('last-updated').innerText = "Sync Failed!";
            document.getElementById('stat-total-nodes').innerText = "ERR";
            loadingSpinner.classList.add('hidden');
        }
    }

    function renderTable(nodes) {
        loadingSpinner.classList.add('hidden');
        leaderboardBody.innerHTML = '';

        if (nodes.length === 0) {
            noResults.classList.remove('hidden');
            return;
        } else {
            noResults.classList.add('hidden');
        }

        nodes.forEach(node => {
            const tr = document.createElement('tr');
            
            let intentClass = 'intent-ứng';
            if (node.intent.includes("tuyển dụng")) intentClass = 'intent-nhà';
            if (node.intent.includes("Freelancer")) intentClass = 'intent-free';

            const skillsHtml = node.top_skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
            
            // Format PublicKey
            const pkShort = node.public_key.substring(0, 6) + '...' + node.public_key.substring(node.public_key.length - 4);

            tr.innerHTML = `
                <td><span class="pubkey" title="${node.public_key}">${pkShort}</span></td>
                <td><span class="pill ${intentClass}">${node.intent}</span></td>
                <td>${node.seniority}</td>
                <td>${skillsHtml}</td>
                <td>$${node.salary_expectation.toLocaleString()}</td>
                <td><span class="status-dot"></span>Active</td>
            `;
            leaderboardBody.appendChild(tr);
        });
    }

    function filterData() {
        const intentVal = intentFilter.value;
        const seniorityVal = seniorityFilter.value;
        const searchVal = skillSearch.value.toLowerCase().trim();

        const filtered = networkData.filter(node => {
            let matchIntent = intentVal === 'All' || node.intent.includes(intentVal);
            let matchSeniority = seniorityVal === 'All' || node.seniority === seniorityVal;
            let matchSearch = true;

            if (searchVal) {
                // Search in skills
                matchSearch = node.top_skills.some(skill => skill.toLowerCase().includes(searchVal));
            }

            return matchIntent && matchSeniority && matchSearch;
        });

        renderTable(filtered);
    }

    // Event Listeners
    intentFilter.addEventListener('change', filterData);
    seniorityFilter.addEventListener('change', filterData);
    searchBtn.addEventListener('click', filterData);
    skillSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') filterData();
    });

    // Init
    fetchStats();
});
