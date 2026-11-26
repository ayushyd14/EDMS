const user = Auth.current();

const read = (key) => {
    try {
        const v = JSON.parse(localStorage.getItem(key));
        return Array.isArray(v) ? v : [];
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

const first = String(user.fullName).split(" ")[0];
const isMe = (value) => Auth.same(value, user.fullName) || Auth.same(value, user.empCode);
const isAuthor = (value) => isMe(value) || Auth.same(value, first);

const projects = read("projectData").filter(p => isMe(p.lead));
const assets = read("assetData").filter(a => isMe(a.assignedTo));
const commits = read("commitData").filter(c => isAuthor(c.author));
const depts = read("departmentData").filter(d => isMe(d.head));

const formatDate = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "Not on record" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

const tenure = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "Not on record";
    const now = new Date();
    let months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) months--;
    if (months < 0) return "Not started yet";
    if (months < 1) return "< 1 month";
    const y = Math.floor(months / 12);
    const m = months % 12;
    return y ? y + "y " + m + "m" : m + "m";
};

// header
document.getElementById("profileName").textContent = user.fullName;
document.getElementById("profileRole").textContent =
    [user.designation, user.country, depts.length ? "Head of " + depts.map(d => d.deptName).join(", ") : ""]
        .filter(Boolean).join(" · ");
Auth.setAvatar(document.getElementById("profileAvatar"), user);
document.getElementById("logoutBtn").addEventListener("click", Auth.logout);

// stats
const stats = [
    [user.empCode, "Emp Code"],
    [formatDate(user.doj), "Date of Joining"],
    [tenure(user.doj), "Time at Edeonaut"],
    [projects.length, "Projects Led"],
    [commits.length, "Commits"],
    [assets.length, "Assets Assigned"],
];

const statGrid = document.getElementById("stats");
stats.forEach(([value, label]) => {
    const card = el("div", "stat-card");
    card.appendChild(el("div", "stat-value", String(value)));
    card.appendChild(el("div", "stat-label", label));
    statGrid.appendChild(card);
});

// my projects
const projectBody = document.getElementById("projectBody");
if (projects.length === 0) {
    projectBody.appendChild(el("div", "panel-empty", "You aren't leading any projects."));
} else {
    projects.forEach(p => {
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
        row.appendChild(el("div", "progress-sub", p.status + " · " + p.priority + " priority · due " + p.deadline));
        row.appendChild(bar);
        projectBody.appendChild(row);
    });
}

// my assets
const assetBody = document.getElementById("assetBody");
if (assets.length === 0) {
    assetBody.appendChild(el("div", "panel-empty", "No assets assigned to you."));
} else {
    assets.forEach(a => {
        const item = el("div", "feed-item");
        item.appendChild(el("div", "", a.assetTag + " · " + a.assetName));
        item.appendChild(el("div", "feed-meta", a.category + " · " + a.status));
        assetBody.appendChild(item);
    });
}

// my commits
const commitBody = document.getElementById("commitBody");
if (commits.length === 0) {
    commitBody.appendChild(el("div", "panel-empty", "No commits logged under your name."));
} else {
    [...commits]
        .sort((a, b) => String(b.commitDate).localeCompare(String(a.commitDate)))
        .slice(0, 10)
        .forEach(c => {
            const item = el("div", "feed-item");
            item.appendChild(el("div", "", c.commitMessage));
            item.appendChild(el("div", "feed-meta", c.branch + " · " + c.commitDate));
            commitBody.appendChild(item);
        });
}