document.addEventListener('DOMContentLoaded', async function() {
    loadDomainRules();
});

async function loadDomainRules() {
    const rulesContainer = document.getElementById('rules-container');
    const noRules = document.getElementById('no-rules');
    
    // Get all domain rules from storage
    const data = await chrome.storage.local.get('domainRules');
    const domainRules = data.domainRules || {};
    
    if (Object.keys(domainRules).length === 0) {
        noRules.style.display = 'block';
        return;
    }
    
    noRules.style.display = 'none';
    
    // Clear existing rules
    while (rulesContainer.firstChild) {
        rulesContainer.removeChild(rulesContainer.firstChild);
    }
    
    // Add each domain rule to the container
    for (const [domain, rule] of Object.entries(domainRules)) {
        const ruleElement = createRuleElement(domain, rule);
        rulesContainer.appendChild(ruleElement);
    }
}

function createRuleElement(domain, rule) {
    const div = document.createElement('div');
    div.className = 'domain-rule';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'domain-info';
    
    const domainSpan = document.createElement('div');
    domainSpan.className = 'domain-name';
    domainSpan.textContent = domain;
    
    const timerSpan = document.createElement('div');
    timerSpan.className = 'timer-value';
    timerSpan.textContent = formatTime(rule.minutes);
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = async () => {
        const data = await chrome.storage.local.get('domainRules');
        const domainRules = data.domainRules || {};
        delete domainRules[domain];
        await chrome.storage.local.set({ domainRules });
        loadDomainRules();
    };
    
    infoDiv.appendChild(domainSpan);
    infoDiv.appendChild(timerSpan);
    div.appendChild(infoDiv);
    div.appendChild(deleteButton);
    
    return div;
}

function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
}
