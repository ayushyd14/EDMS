const read = (key) => {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : [];
    } catch (e) {
        return [];
    }
};

const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

const UNITS = [
    { symbol: "T", size: 1e12 },
    { symbol: "B", size: 1e9 },
    { symbol: "M", size: 1e6 },
    { symbol: "K", size: 1e3 },
];

const formatMoney = (n) => {
    for (const u of UNITS) {
        if (n >= u.size) return +(n / u.size).toFixed(2) + u.symbol;
    }
    return n.toLocaleString("en-US");
};

const employees = read("employeeData");
const servers = read("serverData");
const projects = read("projectData");
const clients = read("clientData");
const departments = read("departmentData");
const assets = read("assetData");
const investors = read("investorData");
const commits = read("commitData");

const online = servers.filter(s => String(s.status).trim().toLowerCase() === "online").length;
const totalInvestment = investors.reduce((sum, i) => {
    const n = Number(String(i.investment).replace(/[^0-9.]/g, ""));
    return sum + (isNaN(n) ? 0 : n);
}, 0);

const stats = [
    [employees.length, "Employees"],
    [departments.length, "Departments"],
    [projects.filter(p => p.status === "Active").length, "Active Projects"],
    [clients.filter(c => c.status === "Active").length, "Active Clients"],
    [online + " / " + servers.length, "Servers Online"],
    [assets.length, "Assets"],
    [investors.length, "Investors"],
    ["$" + formatMoney(totalInvestment), "Total Investment"],
];

const statGrid = document.getElementById("stats");
stats.forEach(([value, label]) => {
    const card = el("div", "stat-card");
    card.appendChild(el("div", "stat-value", String(value)));
    card.appendChild(el("div", "stat-label", label));
    statGrid.appendChild(card);
});

// project portfolio
const projectPanel = document.getElementById("projectPanel");
if (projects.length === 0) {
    projectPanel.appendChild(el("div", "panel-empty", "No projects yet. Add some on the Projects page."));
} else {
    [...projects]
        .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
        .forEach(p => {
            const progress = Math.max(0, Math.min(100, Number(p.progress) || 0));
            const row = el("div", "progress-row");

            const head = el("div", "progress-head");
            head.appendChild(el("span", "", p.codename + " · " + p.projectName));
            head.appendChild(el("span", "", progress + "%"));

            const bar = el("div", "bar");
            const fill = el("div", "bar-fill");
            fill.style.width = progress + "%";
            bar.appendChild(fill);

            row.appendChild(head);
            row.appendChild(el("div", "progress-sub", p.status + " · " + p.lead + " · due " + p.deadline));
            row.appendChild(bar);
            projectPanel.appendChild(row);
        });
}

// recent commits
const commitPanel = document.getElementById("commitPanel");
if (commits.length === 0) {
    commitPanel.appendChild(el("div", "panel-empty", "No commits yet."));
} else {
    [...commits]
        .sort((a, b) => String(b.commitDate).localeCompare(String(a.commitDate)))
        .slice(0, 5)
        .forEach(c => {
            const item = el("div", "feed-item");
            item.appendChild(el("div", "", c.commitMessage));
            item.appendChild(el("div", "feed-meta", c.author + " · " + c.branch + " · " + c.commitDate));
            commitPanel.appendChild(item);
        });
}