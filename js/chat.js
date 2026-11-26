// Profile pictures now live in js/pics.js (PROFILE_PICS and GROUP_PICS).

const filterInput = document.getElementById("filterInput");
const newGroupBtn = document.getElementById("newGroup");
const contactList = document.getElementById("contactList");
const chatAvatar = document.getElementById("chatAvatar");
const chatTitle = document.getElementById("chatTitle");
const chatSub = document.getElementById("chatSub");
const editGroupBtn = document.getElementById("editGroup");
const deleteGroupBtn = document.getElementById("deleteGroup");
const clearChat = document.getElementById("clearChat");
const chatBox = document.getElementById("chatBox");
const typingLine = document.getElementById("typing");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

messageInput.placeholder = "Type a message... (use @Name to ask one person)";

// group modal
const groupModal = document.getElementById("groupModal");
const groupModalTitle = document.getElementById("groupModalTitle");
const groupNameInput = document.getElementById("groupName");
const memberFilter = document.getElementById("memberFilter");
const memberList = document.getElementById("memberList");
const selectedCount = document.getElementById("selectedCount");
const selectShownBtn = document.getElementById("selectShown");
const clearMembersBtn = document.getElementById("clearMembers");
const cancelGroupBtn = document.getElementById("cancelGroup");
const saveGroupBtn = document.getElementById("saveGroup");

const GROUP_KEY = "__all__";              // built-in "All Employees"
const INVESTORS_KEY = "__investors__";    // built-in "All Investors"
const GROUP_PREFIX = "g:";                // custom groups are stored as g:<id>
const INVESTOR_PREFIX = "inv:";           // investor contacts are keyed inv:<name>|<company>
const MAX_MESSAGES = 200;                 // per conversation
const MAX_GROUP_REPLIES = 3;              // how many members answer in a group chat (when nobody is @mentioned)

// Everyone you can chat with is a "person": { kind, key, name, ... }
let employees = loadEmployees();          // kind "employee"
let investors = loadInvestors();          // kind "investor"
let groups = loadGroups();
let conversations = loadConversations();
let activeKey = GROUP_KEY;
let filterText = "";
const pending = {};                       // conversationKey -> names currently "typing"

let editingGroupId = null;                // null = creating a new group
let modalSelected = new Set();            // person keys ticked in the group modal

// ---------- profile pictures (configured in js/pics.js) ----------

function normalizeKey(text) {
    return String(text).trim().toLowerCase();
}

function buildLookup(source) {
    const lookup = {};
    Object.keys(source || {}).forEach(k => { lookup[normalizeKey(k)] = source[k]; });
    return lookup;
}

const personPics = buildLookup(typeof PROFILE_PICS !== "undefined" ? PROFILE_PICS : {});
const groupPics = buildLookup(typeof GROUP_PICS !== "undefined" ? GROUP_PICS : {});

function getPersonPic(person) {
    return personPics[normalizeKey(person.key)] || personPics[normalizeKey(person.name)] || null;
}

function getGroupPic(name) {
    return groupPics[normalizeKey(name)] || null;
}

// Swaps the placeholder only if the image actually loads
function setAvatarImage(el, url) {
    el.dataset.pic = url;
    const img = new Image();
    img.onload = () => {
        if (el.dataset.pic === url) el.style.backgroundImage = "url(" + JSON.stringify(url) + ")";
    };
    img.src = url;
}

// ---------- storage helpers ----------

function loadJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null || value === undefined ? fallback : value;
    } catch (e) {
        return fallback;
    }
}

function loadList(key) {
    const data = loadJSON(key, []);
    return Array.isArray(data) ? data : [];
}

function loadEmployees() {
    const data = loadJSON("employeeData", []);
    if (!Array.isArray(data)) return [];
    return data
        .filter(e => e && e.fullName && e.empCode)
        .map(e => ({
            kind: "employee",
            key: String(e.empCode),
            name: e.fullName,
            country: e.country || "",
            designation: e.designation || ""
        }));
}

function loadInvestors() {
    const data = loadJSON("investorData", []);
    if (!Array.isArray(data)) return [];
    return data
        .filter(i => i && i.investorName)
        .map(i => ({
            kind: "investor",
            key: INVESTOR_PREFIX + i.investorName + "|" + (i.company || ""),
            name: i.investorName,
            company: i.company || "",
            investment: i.investment || "",
            stake: i.stake || ""
        }));
}

function allPeople() {
    return employees.concat(investors);
}

function loadGroups() {
    const data = loadJSON("chatGroups", []);
    return Array.isArray(data)
        ? data.filter(g => g && g.id && g.name && Array.isArray(g.members))
        : [];
}

function saveGroups() {
    localStorage.setItem("chatGroups", JSON.stringify(groups));
}

function loadConversations() {
    const data = loadJSON("chatData", {});
    // Old versions stored a plain array; start fresh if so
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function addMessage(key, message) {
    conversations = loadConversations(); // re-read so other tabs aren't overwritten
    if (!conversations[key]) conversations[key] = [];
    conversations[key].push(message);
    if (conversations[key].length > MAX_MESSAGES) {
        conversations[key] = conversations[key].slice(-MAX_MESSAGES);
    }
    localStorage.setItem("chatData", JSON.stringify(conversations));
}

// ---------- lookups ----------

function isCustomGroupKey(key) {
    return key.startsWith(GROUP_PREFIX);
}

function isBuiltInGroupKey(key) {
    return key === GROUP_KEY || key === INVESTORS_KEY;
}

function getActiveGroup() {
    if (!isCustomGroupKey(activeKey)) return null;
    return groups.find(g => GROUP_PREFIX + g.id === activeKey) || null;
}

function getActivePerson() {
    if (isBuiltInGroupKey(activeKey) || isCustomGroupKey(activeKey)) return null;
    return allPeople().find(p => p.key === activeKey) || null;
}

function getGroupMembers(group) {
    return allPeople().filter(p => group.members.includes(p.key));
}

function isGroupChat() {
    return isBuiltInGroupKey(activeKey) || isCustomGroupKey(activeKey);
}

// Who can answer in the open conversation
function getResponderPool() {
    if (activeKey === GROUP_KEY) return employees;
    if (activeKey === INVESTORS_KEY) return investors;
    const group = getActiveGroup();
    if (group) return getGroupMembers(group);
    const person = getActivePerson();
    return person ? [person] : [];
}

function ensureValidActiveKey() {
    if (isBuiltInGroupKey(activeKey)) return;
    if (isCustomGroupKey(activeKey) ? !getActiveGroup() : !getActivePerson()) {
        activeKey = GROUP_KEY;
    }
}

function matchesQuery(person, query) {
    if (!query) return true;
    const fields = [person.name, person.country, person.designation, person.company];
    if (person.kind === "employee") fields.push(person.key); // Emp Code
    return fields.some(f => (f || "").toLowerCase().includes(query));
}

// ---------- rendering ----------

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildContact(name, key, isGroup, picUrl) {
    const item = document.createElement("li");
    item.className = "contact" + (activeKey === key ? " active" : "");

    const avatar = document.createElement("span");
    avatar.className = "avatar" + (isGroup ? " avatar-group" : "");
    if (picUrl) setAvatarImage(avatar, picUrl);

    const label = document.createElement("span");
    label.className = "contact-name";
    label.textContent = name;

    item.appendChild(avatar);
    item.appendChild(label);
    item.addEventListener("click", () => selectConversation(key));
    return item;
}

function addSection(text) {
    const heading = document.createElement("li");
    heading.className = "contact-section";
    heading.textContent = text;
    contactList.appendChild(heading);
}

function addNote(text) {
    const note = document.createElement("li");
    note.className = "contact-empty";
    note.textContent = text;
    contactList.appendChild(note);
}

function renderContacts() {
    contactList.replaceChildren();

    addSection("Groups");
    contactList.appendChild(buildContact("All Employees", GROUP_KEY, true, getGroupPic("All Employees")));
    contactList.appendChild(buildContact("All Investors", INVESTORS_KEY, true, getGroupPic("All Investors")));

    const query = filterText.trim().toLowerCase();

    const groupMatches = groups.filter(g => !query || g.name.toLowerCase().includes(query));
    groupMatches.forEach(g => contactList.appendChild(buildContact(g.name, GROUP_PREFIX + g.id, true, getGroupPic(g.name))));

    if (employees.length === 0 && investors.length === 0) {
        addNote("No employees or investors yet. Add some on the Employee Database or Investors page.");
        return;
    }

    const employeeMatches = employees.filter(p => matchesQuery(p, query));
    const investorMatches = investors.filter(p => matchesQuery(p, query));

    if (employeeMatches.length === 0 && investorMatches.length === 0 && groupMatches.length === 0) {
        addNote("Nothing matches your filter.");
        return;
    }

    if (employeeMatches.length > 0) {
        addSection("Employees");
        employeeMatches.forEach(p => contactList.appendChild(buildContact(p.name, p.key, false, getPersonPic(p))));
    }

    if (investorMatches.length > 0) {
        addSection("Investors");
        investorMatches.forEach(p => contactList.appendChild(buildContact(p.name, p.key, false, getPersonPic(p))));
    }
}

function renderHeader() {
    const group = getActiveGroup();
    const person = getActivePerson();

    chatAvatar.className = "avatar avatar-lg" + (isGroupChat() ? " avatar-group" : "");
    chatAvatar.style.backgroundImage = "";
    delete chatAvatar.dataset.pic;

    let title = "All Employees";
    let headerPic = getGroupPic("All Employees");

    if (group) {
        title = group.name;
        headerPic = getGroupPic(group.name);
    } else if (person) {
        title = person.name;
        headerPic = getPersonPic(person);
    } else if (activeKey === INVESTORS_KEY) {
        title = "All Investors";
        headerPic = getGroupPic("All Investors");
    }

    chatTitle.textContent = title;
    if (headerPic) setAvatarImage(chatAvatar, headerPic);

    if (group) {
        const names = getGroupMembers(group).map(m => m.name);
        chatSub.textContent = names.length ? "Members: " + names.join(", ") : "No members left in this group";
        chatSub.hidden = false;
    } else {
        chatSub.textContent = "";
        chatSub.hidden = true;
    }

    editGroupBtn.hidden = !group;
    deleteGroupBtn.hidden = !group;
}

function emptyChatMessage() {
    if (activeKey === GROUP_KEY) return "No employees yet. Add some on the Employee Database page.";
    if (activeKey === INVESTORS_KEY) return "No investors yet. Add some on the Investors page.";
    return "This group has no members left. Use Edit Group to add some.";
}

function renderMessages() {
    chatBox.replaceChildren();

    const list = conversations[activeKey] || [];
    const pool = getResponderPool();

    if (pool.length === 0) {
        showEmpty(emptyChatMessage());
    } else if (list.length === 0) {
        showEmpty("No messages yet. Say something!");
    } else {
        list.forEach(m => {
            const wrapper = document.createElement("div");
            wrapper.className = "msg" + (m.mine ? " mine" : "");

            const meta = document.createElement("div");
            meta.className = "msg-meta";
            meta.textContent = (m.mine ? "You" : m.from) + " · " + formatTime(m.time);

            const text = document.createElement("div");
            text.className = "msg-text";
            text.textContent = m.text;

            wrapper.appendChild(meta);
            wrapper.appendChild(text);
            chatBox.appendChild(wrapper);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    messageInput.disabled = pool.length === 0;
}

function showEmpty(message) {
    const empty = document.createElement("div");
    empty.className = "chat-empty";
    empty.textContent = message;
    chatBox.appendChild(empty);
}

function updateTyping() {
    const names = pending[activeKey] || [];
    if (names.length === 0) {
        typingLine.textContent = "";
    } else if (names.length === 1) {
        typingLine.textContent = names[0] + " is typing...";
    } else {
        typingLine.textContent = names.join(", ") + " are typing...";
    }
}

function selectConversation(key) {
    activeKey = key;
    renderContacts();
    renderHeader();
    renderMessages();
    updateTyping();
    messageInput.focus();
}

// ---------- group modal (create / edit) ----------

function openGroupModal(group) {
    editingGroupId = group ? group.id : null;
    groupModalTitle.textContent = group ? "Edit Group" : "New Group";
    groupNameInput.value = group ? group.name : "";
    memberFilter.value = "";
    modalSelected = new Set(group ? group.members : []);
    renderMemberList();
    groupModal.hidden = false;
    groupNameInput.focus();
}

function closeGroupModal() {
    groupModal.hidden = true;
}

function getShownMembers() {
    const query = memberFilter.value.trim().toLowerCase();
    return allPeople().filter(p => matchesQuery(p, query));
}

function updateSelectedCount() {
    selectedCount.textContent = "(" + modalSelected.size + " selected)";
}

function renderMemberList() {
    memberList.replaceChildren();
    updateSelectedCount();

    if (allPeople().length === 0) {
        const none = document.createElement("div");
        none.className = "member-empty";
        none.textContent = "No employees or investors yet.";
        memberList.appendChild(none);
        return;
    }

    const shown = getShownMembers();
    if (shown.length === 0) {
        const none = document.createElement("div");
        none.className = "member-empty";
        none.textContent = "Nobody matches.";
        memberList.appendChild(none);
        return;
    }

    shown.forEach(person => {
        const row = document.createElement("label");
        row.className = "member";

        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = modalSelected.has(person.key);
        box.addEventListener("change", () => {
            if (box.checked) modalSelected.add(person.key);
            else modalSelected.delete(person.key);
            updateSelectedCount();
        });

        const name = document.createElement("span");
        name.textContent = person.name;

        const detail = document.createElement("small");
        detail.textContent = person.kind === "investor" ? "Investor · " + person.company : person.country;

        row.appendChild(box);
        row.appendChild(name);
        row.appendChild(detail);
        memberList.appendChild(row);
    });
}

function saveGroup() {
    const name = groupNameInput.value.trim();
    if (!name) {
        alert("Please enter a group name.");
        return;
    }

    const members = allPeople().filter(p => modalSelected.has(p.key)).map(p => p.key);
    if (members.length === 0) {
        alert("Pick at least one person.");
        return;
    }

    groups = loadGroups(); // re-read so other tabs aren't overwritten
    let key = null;

    if (editingGroupId) {
        const existing = groups.find(g => g.id === editingGroupId);
        if (existing) {
            existing.name = name;
            existing.members = members;
            key = GROUP_PREFIX + existing.id;
        }
    }

    if (!key) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        groups.push({ id: id, name: name, members: members });
        key = GROUP_PREFIX + id;
    }

    saveGroups();
    closeGroupModal();
    selectConversation(key);
}

// ---------- @mentions ----------

// "@Brad Q. how are the servers?" -> only Brad answers.
// Matches full name, Emp Code, or a first name that is unique in the open chat.
function parseMentions(text, pool) {
    const people = [];
    let cleaned = text;

    [...pool].sort((a, b) => b.name.length - a.name.length).forEach(p => {
        const candidates = [p.name];
        if (p.kind === "employee") candidates.push(p.key);

        const first = firstName(p);
        const uniqueFirst = pool.filter(x => normalizeKey(firstName(x)) === normalizeKey(first)).length === 1;
        if (uniqueFirst && first.length >= 2) candidates.push(first);

        for (const c of candidates) {
            const regex = new RegExp("@" + escapeRegex(c) + "(?![a-z0-9])", "i");
            if (regex.test(cleaned)) {
                if (!people.includes(p)) people.push(p);
                cleaned = cleaned.replace(regex, " ");
                break;
            }
        }
    });

    const unknown = /(^|\s)@\S+/.test(cleaned);
    return { people: people, cleaned: cleaned.replace(/\s+/g, " ").trim(), unknown: unknown };
}

// ---------- replies ----------

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function firstName(person) {
    return (person.name || "").split(" ")[0] || "me";
}

function formatMoney(value) {
    const n = Number(value);
    if (isNaN(n)) return String(value);
    const units = [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]];
    for (const [symbol, size] of units) {
        if (n >= size) return +(n / size).toFixed(2) + symbol;
    }
    return n.toLocaleString("en-US");
}

function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// true if `term` appears in `text` as a whole word / token
function mentions(text, term) {
    const t = String(term || "").trim();
    if (!t) return false;
    return new RegExp("(^|[^a-z0-9])" + escapeRegex(t) + "([^a-z0-9]|$)", "i").test(text);
}

function plural(n, word, pluralWord) {
    return n + " " + (n === 1 ? word : (pluralWord || word + "s"));
}

function sameText(a, b) {
    return !!a && !!b && normalizeKey(a) === normalizeKey(b);
}

function isMe(person, value) {
    return sameText(value, person.name) || sameText(value, person.key);
}

function isAuthor(person, value) {
    return isMe(person, value) || sameText(value, firstName(person));
}

function daysUntil(dateStr) {
    const t = Date.parse(dateStr);
    if (isNaN(t)) return null;
    const today = Date.parse(new Date().toISOString().slice(0, 10));
    return Math.round((t - today) / 86400000);
}

function sumOf(list, field) {
    return list.reduce((s, x) => s + (Number(String(x[field]).replace(/[^0-9.]/g, "")) || 0), 0);
}

// -- company records (projects, clients, assets, departments)

// Finds a record the message names directly: project codename/name, asset tag, client, department
function lookupRecord(text) {
    const project = loadList("projectData").find(p => p && (mentions(text, p.codename) || mentions(text, p.projectName)));
    if (project) return { type: "project", item: project };

    const asset = loadList("assetData").find(a => a && mentions(text, a.assetTag));
    if (asset) return { type: "asset", item: asset };

    const client = loadList("clientData").find(c => c && mentions(text, c.clientName));
    if (client) return { type: "client", item: client };

    const dept = loadList("departmentData").find(d => d && (mentions(text, d.deptName) || mentions(text, d.deptCode)));
    if (dept) return { type: "department", item: dept };

    return null;
}

function recordReply(found) {
    const x = found.item;
    if (found.type === "project") {
        return x.codename + " (" + x.projectName + "): " + x.status + ", " + x.progress + "% done, " +
            x.priority + " priority, led by " + x.lead + ", due " + x.deadline + ".";
    }
    if (found.type === "client") {
        return x.clientName + " (" + x.industry + ", " + x.country + "): contact is " +
            x.contactPerson + ", account is " + x.status + ".";
    }
    if (found.type === "asset") {
        return x.assetTag + " is a " + x.assetName + " (" + x.category + "), " + x.status +
            (x.assignedTo ? ", assigned to " + x.assignedTo : ", unassigned") + ".";
    }
    return x.deptName + " (" + x.deptCode + "): headed by " + x.head + ", based in " + x.location + ".";
}

function investorRecordReply(found) {
    const x = found.item;
    if (found.type === "project") {
        return "How is " + x.codename + " tracking? It's at " + x.progress + "% with a " + x.deadline +
            " deadline. Will it land on time and on budget?";
    }
    if (found.type === "client") {
        return "I see $" + formatMoney(x.contractValue) + " on the " + x.clientName + " contract. Is it renewing?";
    }
    return recordReply(found);
}

// -- engineers (employees): every topic returns { summary, take } built from the databases

function offlineServers() {
    return loadList("serverData").filter(s => String(s.status).trim().toLowerCase() === "offline");
}

function latestCommit(commits) {
    return commits.reduce((a, b) => (String(b.commitDate) >= String(a.commitDate) ? b : a));
}

function serverTopic() {
    const servers = loadList("serverData");
    if (servers.length === 0) {
        return { summary: "There are no servers on the Server Database page yet.", take: "Add them there and I can track uptime." };
    }
    const down = offlineServers();
    const up = servers.filter(s => String(s.status).trim().toLowerCase() === "online").length;
    let summary = plural(servers.length, "server") + " on record, " + up + " online";
    if (down.length) {
        summary += " and " + down.length + " offline (" +
            down.map(s => s.serverName + (s.location ? " in " + s.location : "")).join(", ") + ")";
    }
    summary += ".";
    return {
        summary: summary,
        take: down.length ? "I'd start with " + down[0].serverName + ": check its logs and the last deploy." : "Nothing to chase there right now."
    };
}

function commitTopic(person) {
    const commits = loadList("commitData");
    if (commits.length === 0) {
        return { summary: "The commit log is empty.", take: "Nothing has been pushed yet." };
    }
    const latest = latestCommit(commits);
    const branches = {};
    commits.forEach(c => { branches[c.branch] = (branches[c.branch] || 0) + 1; });
    const names = Object.keys(branches);
    const busiest = names.sort((a, b) => branches[b] - branches[a])[0];
    const mine = commits.filter(c => isAuthor(person, c.author)).length;

    let summary = plural(commits.length, "commit") + " across " + plural(names.length, "branch", "branches") +
        ", busiest is " + busiest + '. Latest: "' + latest.commitMessage + '" by ' + latest.author +
        " on " + latest.branch + " (" + latest.commitDate + ").";
    if (mine) summary += " " + mine + " of them are mine.";
    return { summary: summary, take: "Keep commits small and the review queue short." };
}

function projectTopic(person) {
    const projects = loadList("projectData");
    if (projects.length === 0) {
        return { summary: "There are no projects on the board yet.", take: "Add some on the Projects page and I'll track them." };
    }
    const counts = ["Active", "Planning", "On Hold", "Completed"]
        .map(s => [s, projects.filter(p => p.status === s).length])
        .filter(entry => entry[1] > 0)
        .map(entry => entry[1] + " " + entry[0].toLowerCase());
    const open = projects.filter(p => p.status !== "Completed");
    const overdue = open.filter(p => { const d = daysUntil(p.deadline); return d !== null && d < 0; });
    const upcoming = open
        .filter(p => { const d = daysUntil(p.deadline); return d !== null && d >= 0; })
        .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
    const mine = projects.filter(p => isMe(person, p.lead));

    let summary = plural(projects.length, "project") + " on the board (" + counts.join(", ") + ").";
    if (overdue.length) summary += " Overdue: " + overdue.map(p => p.codename).join(", ") + ".";
    if (upcoming.length) summary += " Next due: " + upcoming[0].codename + " on " + upcoming[0].deadline + ".";
    if (mine.length) summary += " I'm leading " + mine.map(p => p.codename + " (" + p.progress + "%)").join(", ") + ".";

    return {
        summary: summary,
        take: overdue.length ? "Overdue work comes first. I'd re-plan " + overdue[0].codename + "." : "Ask me about any codename for details."
    };
}

function clientTopic() {
    const clients = loadList("clientData");
    if (clients.length === 0) {
        return { summary: "There are no clients on record yet.", take: "Add some on the Clients page." };
    }
    const active = clients.filter(c => c.status === "Active");
    const prospects = clients.filter(c => c.status === "Prospect").length;
    const churned = clients.filter(c => c.status === "Churned").length;
    const top = [...active].sort((a, b) => (Number(b.contractValue) || 0) - (Number(a.contractValue) || 0))[0];

    let summary = plural(clients.length, "client") + " on record, " + active.length + " active worth $" +
        formatMoney(sumOf(active, "contractValue")) + " in contracts";
    if (top) summary += "; biggest is " + top.clientName + " ($" + formatMoney(top.contractValue) + ")";
    summary += ".";
    if (prospects) summary += " " + plural(prospects, "prospect") + " in the pipeline.";
    if (churned) summary += " " + churned + " churned.";

    return { summary: summary, take: "Account health is a sales call, but I'll make sure delivery keeps up." };
}

function assetTopic(person) {
    const assets = loadList("assetData");
    if (assets.length === 0) {
        return { summary: "There are no assets on record yet.", take: "Add some on the Assets page." };
    }
    const byStatus = ["In Use", "In Stock", "Under Repair", "Retired"]
        .map(s => [s, assets.filter(a => a.status === s).length])
        .filter(entry => entry[1] > 0)
        .map(entry => entry[1] + " " + entry[0].toLowerCase());
    const repair = assets.filter(a => a.status === "Under Repair");
    const mine = assets.filter(a => isMe(person, a.assignedTo));

    let summary = plural(assets.length, "asset") + " on record (" + byStatus.join(", ") + ").";
    if (repair.length) summary += " Under repair: " + repair.map(a => a.assetTag).join(", ") + ".";
    if (mine.length) summary += " Assigned to me: " + mine.map(a => a.assetTag).join(", ") + ".";

    return {
        summary: summary,
        take: repair.length ? "Raise a ticket for " + repair[0].assetTag + " if it's blocking anyone." : "Inventory looks healthy."
    };
}

function departmentTopic(person) {
    const depts = loadList("departmentData");
    if (depts.length === 0) {
        return { summary: "There are no departments on record yet.", take: "Add some on the Departments page." };
    }
    const mine = depts.filter(d => isMe(person, d.head));
    let summary = plural(depts.length, "department") + ": " + depts.map(d => d.deptName + " (" + d.head + ")").join(", ") + ".";
    if (mine.length) summary += " I head " + mine.map(d => d.deptName).join(", ") + ".";
    return { summary: summary, take: "" };
}

function teamTopic(person) {
    if (employees.length === 0) {
        return { summary: "There are no employees in the system yet.", take: "" };
    }
    const countries = new Set(employees.map(e => normalizeKey(e.country)).filter(Boolean));
    let summary = plural(employees.length, "employee") + " in the system across " + plural(countries.size, "country", "countries") + ".";
    if (person.country) {
        const here = employees.filter(e => e.key !== person.key && sameText(e.country, person.country)).length;
        summary += " " + plural(here, "colleague") + " here in " + person.country + ".";
    }
    return { summary: summary, take: employees.length > 1 ? "Use @Name to ask someone directly." : "" };
}

function investorTopic() {
    const list = loadList("investorData");
    if (list.length === 0) {
        return { summary: "There are no investors on record yet.", take: "Management handles that side." };
    }
    const top = [...list].sort((a, b) => sumOf([b], "investment") - sumOf([a], "investment"))[0];
    return {
        summary: plural(list.length, "investor") + " backing us with $" + formatMoney(sumOf(list, "investment")) +
            " in total; largest is " + top.investorName + " ($" + formatMoney(sumOf([top], "investment")) + ").",
        take: "Money matters are for management. I keep the product shipping."
    };
}

function deployTopic(person) {
    const down = offlineServers();
    return {
        summary: "Pre-flight check: " + serverTopic().summary + " " + commitTopic(person).summary,
        take: down.length
            ? "Don't ship until " + down[0].serverName + " is back."
            : pick([
                "Is staging green? Don't push to prod until it is.",
                "Run the pipeline first. If it passes, ship it. And never on a Friday.",
                "Make sure there's a rollback plan before we deploy."
            ])
    };
}

function bugTopic(person) {
    const down = offlineServers();
    const commits = loadList("commitData");
    let summary = "Suspects from the data: " +
        (down.length ? "offline servers (" + down.map(s => s.serverName).join(", ") + ")." : "no servers are marked offline.");
    if (commits.length) {
        const latest = latestCommit(commits);
        summary += ' Most recent change: "' + latest.commitMessage + '" by ' + latest.author + " on " + latest.branch + ".";
    }
    return {
        summary: summary,
        take: pick([
            "Can you share the stack trace? Does it reproduce on a clean build?",
            "Check the logs first. I'd bet on a null reference.",
            "Open a ticket with repro steps and I'll look after standup."
        ])
    };
}

function overviewTopic() {
    const servers = loadList("serverData");
    const online = servers.filter(s => String(s.status).trim().toLowerCase() === "online").length;
    const active = loadList("projectData").filter(p => p.status === "Active").length;
    const clients = loadList("clientData").filter(c => c.status === "Active").length;
    return {
        summary: "Here's what the system shows: " + plural(employees.length, "employee") + ", " +
            plural(active, "active project") + ", " + online + " of " + servers.length + " servers online, " +
            plural(clients, "active client") + ", " + plural(loadList("assetData").length, "asset") + ".",
        take: pick(engineerFallbacks)
    };
}

// a particular employee named in the message (with or without @)
function namedEmployees(text) {
    return employees.filter(e => {
        if (mentions(text, e.name)) return true;
        const first = firstName(e);
        const unique = employees.filter(x => sameText(firstName(x), first)).length === 1;
        return unique && first.length >= 3 && mentions(text, first);
    });
}

function personTopic(target, me) {
    const projects = loadList("projectData").filter(p => isMe(target, p.lead));
    const assets = loadList("assetData").filter(a => isMe(target, a.assignedTo));
    const commits = loadList("commitData").filter(c => isAuthor(target, c.author));
    const depts = loadList("departmentData").filter(d => isMe(target, d.head));

    const bits = [];
    if (projects.length) bits.push("leads " + projects.map(p => p.codename + " (" + p.progress + "%)").join(", "));
    if (depts.length) bits.push("heads " + depts.map(d => d.deptName).join(", "));
    if (commits.length) bits.push(plural(commits.length, "commit") + " logged");
    if (assets.length) bits.push(plural(assets.length, "asset") + " assigned");

    const summary = target.name + " is " + (target.designation || "on the team") +
        (target.country ? " based in " + target.country : "") + (bits.length ? "; " + bits.join("; ") : "") + ".";
    return { summary: summary, take: target.key === me.key ? "That's me. Ask away." : "Use @" + target.name + " to ask them directly." };
}

function recordTopic(found, person) {
    const x = found.item;
    let summary = recordReply(found);
    let take = "";

    if (found.type === "project") {
        const d = daysUntil(x.deadline);
        if (x.status !== "Completed" && d !== null) {
            if (d < 0) summary += " It's " + plural(-d, "day") + " overdue.";
            else if (d === 0) summary += " Due today.";
            else if (d <= 14) summary += " " + plural(d, "day") + " left.";
        }
        if (isMe(person, x.lead)) take = "That's mine. I'll keep it moving.";
        else if (x.status === "On Hold") take = "It's on hold. Someone needs to unblock it.";
        else if (d !== null && d < 0 && x.status !== "Completed") take = "It needs a re-plan.";
    } else if (found.type === "asset" && isMe(person, x.assignedTo)) {
        take = "That one's with me.";
    } else if (found.type === "department" && isMe(person, x.head)) {
        take = "That's my department.";
    }
    return { summary: summary, take: take };
}

// Topics tried in order; a message can hit two. "solo" topics answer alone.
const engineerTopics = [
    { test: /\b(deploy(ed|ment|ing)?|release|prod|production|ship(ping)?)\b/, run: deployTopic, solo: true },
    { test: /\b(bugs?|errors?|crash(es|ed)?|issues?|broken|fail(s|ed|ing)?|exception)\b/, run: bugTopic, solo: true },
    { test: /\b(servers?|uptime|downtime|offline|outage|ping)\b/, run: serverTopic },
    { test: /\b(commits?|push(ed)?|pull request|prs?|merge[ds]?|branch(es)?|git)\b/, run: commitTopic },
    { test: /\b(projects?|codenames?|milestones?|roadmap|sprints?|portfolio|deadlines?|eta|due|overdue|progress|status)\b/, run: projectTopic },
    { test: /\b(clients?|customers?|accounts?|contracts?)\b/, run: clientTopic },
    { test: /\b(assets?|laptops?|hardware|equipment|inventory|licen[sc]es?)\b/, run: assetTopic },
    { test: /\b(departments?|depts?|org chart)\b/, run: departmentTopic },
    { test: /\b(team|colleagues?|staff|headcount|employees?|people|countries)\b/, run: teamTopic },
    { test: /\b(investors?|funding|investment|stake|shareholders?)\b/, run: investorTopic },
];

const engineerSmallTalk = [
    {
        test: /\b(review|reviews|reviewing|code review)\b/,
        reply: ["Send me the PR link. I'll review it by end of day.", "Keep the diff small and I'll review it faster."]
    },
    {
        test: /\b(tests?|testing|unit|coverage|qa)\b/,
        reply: ["Did you add unit tests? Coverage matters.", "Run the full suite locally before you push."]
    },
    {
        test: /\b(meeting|standup|call|sync)\b/,
        reply: ["Could that be a message instead? Kidding. What time works?", "I'm free after standup."]
    },
    {
        test: /\b(when|done|ready)\b/,
        reply: [
            "ETA depends on the review queue. Realistically, end of the week.",
            "Almost there. Just fixing the last failing test.",
            "I'll update the ticket as soon as it's merged."
        ]
    },
    {
        test: /\b(help|stuck|how do|how to|issue with)\b/,
        reply: ["Walk me through what you've tried so far.", "Have you checked the docs? If it's not there, send me the details."]
    },
    {
        test: /\b(thanks?|thank you|thx|cheers)\b/,
        reply: ["No problem! Ping me if it breaks again.", "Anytime."]
    },
    {
        test: /\b(coffee|lunch|break|chai|tea)\b/,
        reply: ["Yes please. Coffee first, debugging after.", "Give me ten minutes, I'm mid-build."]
    },
    {
        test: /\b(bye|goodbye|cya|later|good night)\b/,
        reply: ["Later! Don't forget to pull before you push.", "Bye! Commit your work."]
    },
    {
        test: /\b(hi|hello|hey|yo|sup|hola|namaste)\b/,
        reply: person => pick([
            "Hey! " + firstName(person) + " here" + (person.designation ? ", " + person.designation : "") + ". What's up?",
            "Hello! Currently waiting on a build, so go ahead.",
            "Hey, give me a sec, just finishing a merge."
        ])
    }
];

const engineerFallbacks = [
    "Can you give me more context?",
    "Let me check and get back to you.",
    "Can you open a ticket so it doesn't get lost?",
    "Works on my machine. Can you send the exact steps?"
];

function composeReply(parts) {
    const summary = parts.map(p => p.summary).join(" ");
    const take = (parts.find(p => p.take) || {}).take;
    return pick(["Quick summary: ", "Here's where we stand: ", "Short version: "]) + summary + (take ? " " + take : "");
}

function getEmployeeReply(person, text) {
    const lower = text.toLowerCase();

    if (/\b(salary|pay|payroll|raise|bonus|appraisal)\b/.test(lower)) {
        return pick(["That's one for HR, not me.", "I just write code. Ask HR about pay."]);
    }

    const parts = [];

    const named = namedEmployees(lower);
    if (named.length) parts.push(personTopic(named[0], person));

    const found = lookupRecord(lower);
    if (found) {
        parts.push(recordTopic(found, person));
    } else {
        for (const topic of engineerTopics) {
            if (parts.length >= 2) break;
            if (!topic.test.test(lower)) continue;
            if (topic.solo) {
                parts.push(topic.run(person));
                break;
            }
            parts.push(topic.run(person));
        }
    }

    if (parts.length > 0) return composeReply(parts);

    for (const rule of engineerSmallTalk) {
        if (rule.test.test(lower)) {
            return typeof rule.reply === "function" ? rule.reply(person) : pick(rule.reply);
        }
    }

    return composeReply([overviewTopic()]);
}

// -- investors

function investmentReply(person) {
    return "I have $" + formatMoney(person.investment) + " in " + person.company + ". I expect to see it working hard.";
}

function stakeReply(person) {
    return "My stake in " + person.company + " is " + person.stake + "%. Talk to me before anything dilutes it.";
}

function projectInvestorReply() {
    const projects = loadList("projectData");
    if (projects.length === 0) return "I don't see a project pipeline yet. What are we building?";
    const live = projects.filter(p => p.status === "Active").length;
    const avg = Math.round(projects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / projects.length);
    return projects.length + " project(s) in the pipeline, " + live + " active, " + avg +
        "% average progress. Which ones move the revenue?";
}

function clientInvestorReply() {
    const clients = loadList("clientData");
    if (clients.length === 0) return "I don't see any clients on record yet. Who's paying us?";
    const active = clients.filter(c => c.status === "Active");
    const total = active.reduce((sum, c) => sum + (Number(c.contractValue) || 0), 0);
    return clients.length + " client(s), " + active.length + " active, $" + formatMoney(total) +
        " in active contracts. What's the renewal outlook?";
}

const investorRules = [
    { test: /\b(invest(ed|ment|ments|ing)?|money|funds?|funding|capital|amount|cheque)\b/, reply: investmentReply },
    { test: /\b(stake|equity|ownership|shares?|dilut\w*)\b/, reply: stakeReply },
    { test: /\b(projects?|codenames?|milestones?|pipeline)\b/, reply: projectInvestorReply },
    { test: /\b(clients?|contracts?|accounts?)\b/, reply: clientInvestorReply },
    {
        test: /\b(returns?|roi|profits?|dividends?|payouts?|exit|ipo)\b/,
        reply: [
            "Returns come at exit, not before. What's the path to one?",
            "I'm looking at a three to five year horizon. Where are we on that?",
            "Show me how this turns into a return."
        ]
    },
    {
        test: /\b(revenue|growth|metrics?|numbers?|mrr|arr|kpis?|sales|customers?)\b/,
        reply: [
            "Send me the latest revenue and growth numbers.",
            "What are the month-on-month figures? I don't want a snapshot, I want a trend.",
            "Numbers first, story second."
        ]
    },
    {
        test: /\b(burn|runway|cash|budget|costs?|expenses?)\b/,
        reply: ["What's the current burn rate, and how many months of runway is that?", "Keep costs tight. Send me the budget."]
    },
    {
        test: /\b(valuation|round|series [abc]|seed|raise|raising|cap table|term sheet)\b/,
        reply: ["At what valuation? I'd want to see the cap table first.", "Send the term sheet. My lawyers will go through it."]
    },
    {
        test: /\b(pitch|deck|proposal|plan|roadmap|strategy)\b/,
        reply: ["Send the deck. Keep it under fifteen slides.", "What does the roadmap look like for the next two quarters?"]
    },
    {
        test: /\b(meeting|call|board|agenda|sync|update)\b/,
        reply: ["Let's put it on the calendar. Send the agenda first.", "I can do a short call. Keep it to the point."]
    },
    {
        test: /\b(team|hire|hiring|talent|employees?)\b/,
        reply: ["I back people first. Who's on the team?", "Are we hiring ahead of revenue? I'd want to understand why."]
    },
    {
        test: /\b(risks?|competitors?|competition|market)\b/,
        reply: ["What's the biggest risk right now, and what's the plan for it?", "Who are the competitors, and why do we win?"]
    },
    {
        test: /\b(salary|pay|payroll)\b/,
        reply: ["Keep payroll in line with the budget. Send me the figures."]
    },
    {
        test: /\b(servers?|uptime|downtime|outage|bugs?|deploy(ed|ment)?)\b/,
        reply: ["That's engineering's call, but tell me if it's costing us customers.", "Is the downtime hurting revenue? That's what I care about."]
    },
    {
        test: /\b(thanks?|thank you|thx|cheers)\b/,
        reply: ["Of course. Keep me posted.", "Good. Send updates regularly."]
    },
    {
        test: /\b(coffee|lunch|dinner)\b/,
        reply: ["Happy to. Bring the numbers along.", "Lunch works. Let's talk about the quarter."]
    },
    {
        test: /\b(bye|goodbye|cya|later|good night)\b/,
        reply: ["Goodbye. Send me that update.", "Talk soon."]
    },
    {
        test: /\b(hi|hello|hey|yo|sup|hola|namaste)\b/,
        reply: person => pick([
            "Hello. " + firstName(person) + " here. What do you have for me?",
            "Hi. Any updates on the numbers?",
            "Hello. Make it quick, I have another call soon."
        ])
    }
];

const investorFallbacks = [
    "Interesting. What does it do for the bottom line?",
    "Walk me through the numbers.",
    "What's the plan for the next quarter?",
    "I'll need to run this by my partners."
];

function getReply(person, text) {
    if (person.kind !== "investor") return getEmployeeReply(person, text);

    const lower = text.toLowerCase();

    const found = lookupRecord(lower);
    if (found) return investorRecordReply(found);

    for (const rule of investorRules) {
        if (rule.test.test(lower)) {
            return typeof rule.reply === "function" ? rule.reply(person) : pick(rule.reply);
        }
    }
    return pick(investorFallbacks);
}

function scheduleReply(key, person, userText, delay) {
    if (!pending[key]) pending[key] = [];
    pending[key].push(person.name);
    updateTyping();

    setTimeout(() => {
        const names = pending[key] || [];
        const index = names.indexOf(person.name);
        if (index !== -1) names.splice(index, 1);

        addMessage(key, { mine: false, from: person.name, text: getReply(person, userText), time: Date.now() });

        if (activeKey === key) {
            renderMessages();
            updateTyping();
        }
    }, delay);
}

// ---------- events ----------

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    const pool = getResponderPool();
    if (!text || pool.length === 0) return;

    const key = activeKey;
    addMessage(key, { mine: true, from: "You", text: text, time: Date.now() });
    messageInput.value = "";

    const parsed = parseMentions(text, pool);

    // an @ that matches nobody in this chat: say so, nobody replies
    if (parsed.unknown && parsed.people.length === 0) {
        addMessage(key, {
            mine: false,
            from: "System",
            text: "Nobody in this chat matches that @mention. Use @ followed by a full name, a unique first name or an Emp Code.",
            time: Date.now()
        });
        renderMessages();
        return;
    }

    renderMessages();

    // @mentioned people answer alone; otherwise the usual rules apply
    const responders = parsed.people.length > 0
        ? parsed.people
        : (isGroupChat()
            ? [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_GROUP_REPLIES)
            : pool);

    const question = parsed.cleaned || text;

    responders.forEach((person, i) => {
        scheduleReply(key, person, question, 800 + i * 900 + Math.random() * 700);
    });
});

filterInput.addEventListener("input", () => {
    filterText = filterInput.value;
    renderContacts();
});

clearChat.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear this conversation?")) {
        conversations = loadConversations();
        delete conversations[activeKey];
        localStorage.setItem("chatData", JSON.stringify(conversations));
        renderMessages();
    }
});

newGroupBtn.addEventListener("click", () => openGroupModal(null));

editGroupBtn.addEventListener("click", () => {
    const group = getActiveGroup();
    if (group) openGroupModal(group);
});

deleteGroupBtn.addEventListener("click", () => {
    const group = getActiveGroup();
    if (!group) return;
    if (confirm('Delete the group "' + group.name + '" and its messages?')) {
        groups = loadGroups().filter(g => g.id !== group.id);
        saveGroups();
        conversations = loadConversations();
        delete conversations[GROUP_PREFIX + group.id];
        localStorage.setItem("chatData", JSON.stringify(conversations));
        selectConversation(GROUP_KEY);
    }
});

memberFilter.addEventListener("input", renderMemberList);

selectShownBtn.addEventListener("click", () => {
    getShownMembers().forEach(p => modalSelected.add(p.key));
    renderMemberList();
});

clearMembersBtn.addEventListener("click", () => {
    modalSelected.clear();
    renderMemberList();
});

cancelGroupBtn.addEventListener("click", closeGroupModal);
saveGroupBtn.addEventListener("click", saveGroup);

groupModal.addEventListener("click", (event) => {
    if (event.target === groupModal) closeGroupModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !groupModal.hidden) closeGroupModal();
});

// Keep in sync with other tabs (employees, investors, groups and messages)
window.addEventListener("storage", (event) => {
    if (event.key === "employeeData" || event.key === "investorData" || event.key === "chatGroups") {
        if (event.key === "employeeData") employees = loadEmployees();
        if (event.key === "investorData") investors = loadInvestors();
        if (event.key === "chatGroups") groups = loadGroups();
        ensureValidActiveKey();
        renderContacts();
        renderHeader();
        renderMessages();
        if (!groupModal.hidden) renderMemberList();
    } else if (event.key === "chatData") {
        conversations = loadConversations();
        renderMessages();
    }
});

selectConversation(GROUP_KEY);