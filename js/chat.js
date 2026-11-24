// ============================================================
//  PROFILE PICTURES: edit these two lists, nothing else.
//  Key = Emp Code OR full name (not case sensitive) / group name.
//  Investors are matched by their name.
//  Value = image path, relative to the html/ pages ("../images/...").
//  Anyone not listed, or with a wrong path, keeps the grey placeholder.
// ============================================================
const PROFILE_PICS = {
    "190021": "../images/190021.jpg",   // Brad Q.
    "210219": "../images/210219.jpg",   // V.C. Chandrapaul
    "07032": "https://thumbs.dreamstime.com/b/asian-business-man-profile-icon-chinese-japanese-businessman-avatar-isolated-flat-vector-illustration-asian-business-man-108213215.jpg",   // Chris Harrison
    "020002": "https://mir-s3-cdn-cf.behance.net/project_modules/hd/d95c1f148207527.62d1246c25004.jpg",   // Zuvloć Romilly
    "150028": "https://static.vecteezy.com/system/resources/previews/055/281/758/non_2x/male-avatar-illustration-for-profile-or-projects-vector.jpg",   // Leo Cooper
    "98004": "https://thumbs.dreamstime.com/b/asian-businessman-profile-icon-isolated-male-chinese-japanese-business-man-avatar-flat-vector-illustration-108617465.jpg",   // Vishy Sharma
    "970001": "https://static.vecteezy.com/system/resources/previews/036/190/422/non_2x/old-business-man-blank-profile-photo-vector.jpg",   // Edwin Foster
    "030009": "https://img.magnific.com/premium-vector/portrait-asian-person-casual-clothes-happy-young-man-avatar-male-face-head-chinese-korean-japanese-nationality-user-profile-flat-isolated-vector-illustration-white-background_633472-5682.jpg?semt=ais_hybrid&w=740&q=80",   // Shikaku Nakuru
    "Warren Buffett (Berkshire Hathaway)": "https://www.givingpledge.org/wp-content/uploads/2025/03/Buffett_500x500.jpg",   // Shikaku Nakuru
    "Mohammad bin Salman Al-Saud": "https://cdn.i-scmp.com/sites/default/files/styles/768x768/public/d8/images/methode/2019/12/13/6b06cb22-1ca7-11ea-8971-922fdc94075f_image_hires_132744.jpg?itok=XditGQBc&v=1576214873",   // Shikaku Nakuru
    "Daniel Sundheim": "https://imageio.forbes.com/specials-images/imageserve/6063814730d15bbcd7ce7e1c/0x0.jpg?format=jpg&crop=1361,1362,x0,y435,safe&height=416&width=416&fit=bounds",   // Shikaku Nakuru
    "Bill Ackman (Pershing Square)": "https://pershingsquaresparcholdings.com/wp-content/uploads/2020/06/Bill-Ackman-Photo-2026.jpg",   // Shikaku Nakuru
    "21012": "https://thumbs.dreamstime.com/b/brown-hair-businesswoman-avatar-woman-face-profile-icon-concept-online-support-service-female-cartoon-character-portrait-brown-126956822.jpg",   // Shikaku Nakuru
};

const GROUP_PICS = {
    "All Employees": "../images/all-employees.png",
    "India-Japan Branch": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd9CSO0LSrU2PxkW9IKsxRA8q1Z_q-MNlA-WtZunbdxw&s=10",
    "German-French Branch": "https://thumbs.dreamstime.com/b/france-germany-circle-flags-d-icon-round-german-french-national-symbols-vector-304673402.jpg",
    // "German-French Branch": "../images/german-french.png",
};

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
const MAX_GROUP_REPLIES = 3;              // how many members answer in a group chat

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

// ---------- profile pictures (configured at the top of this file) ----------

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

// ---------- replies ----------

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function firstName(person) {
    return (person.name || "").split(" ")[0] || "me";
}

function formatMoney(value) {
    const n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString("en-US");
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

// -- engineers (employees)

function serverReply() {
    const servers = loadJSON("serverData", []);
    if (!Array.isArray(servers) || servers.length === 0) {
        return "I don't see any servers on the Server Database page yet.";
    }
    const offline = servers.filter(s => String(s.status).trim().toLowerCase() === "offline");
    if (offline.length === 0) {
        return servers.length + " server(s) on record, none marked offline.";
    }
    return servers.length + " server(s) on record, " + offline.length + " marked offline: " +
        offline.map(s => s.serverName).join(", ") + ". I'll look into it.";
}

function commitReply() {
    const commits = loadJSON("commitData", []);
    if (!Array.isArray(commits) || commits.length === 0) {
        return "Nothing in the commit log yet.";
    }
    const latest = commits.reduce((a, b) => (b.commitDate >= a.commitDate ? b : a));
    return 'Latest commit on record: "' + latest.commitMessage + '" by ' + latest.author +
        " on " + latest.branch + ", dated " + latest.commitDate + ".";
}

function projectReply(person) {
    const projects = loadList("projectData");
    if (projects.length === 0) return "No projects on the board yet. Add some on the Projects page.";

    const mine = projects.filter(p =>
        normalizeKey(p.lead) === normalizeKey(person.name) || normalizeKey(p.lead) === normalizeKey(person.key));
    if (mine.length > 0) {
        return "I'm leading " + mine.map(p => p.codename + " (" + p.progress + "%)").join(", ") +
            ". Ask me about any codename.";
    }

    const live = projects.filter(p => p.status === "Active").length;
    return projects.length + " project(s) on the board, " + live + " active: " +
        projects.map(p => p.codename).join(", ") + ". Ask me about a codename.";
}

function clientReply() {
    const clients = loadList("clientData");
    if (clients.length === 0) return "No clients on record yet. Add some on the Clients page.";
    const active = clients.filter(c => c.status === "Active");
    return clients.length + " client(s) on record, " + active.length + " active" +
        (active.length ? ": " + active.map(c => c.clientName).join(", ") : "") + ".";
}

function assetReply() {
    const assets = loadList("assetData");
    if (assets.length === 0) return "No assets on record yet. Add some on the Assets page.";
    const repair = assets.filter(a => a.status === "Under Repair");
    const stock = assets.filter(a => a.status === "In Stock").length;
    return assets.length + " asset(s) on record, " + stock + " in stock, " + repair.length + " under repair" +
        (repair.length ? ": " + repair.map(a => a.assetTag).join(", ") : "") + ".";
}

function departmentReply() {
    const depts = loadList("departmentData");
    if (depts.length === 0) return "No departments on record yet. Add some on the Departments page.";
    return depts.length + " department(s): " + depts.map(d => d.deptName + " (" + d.head + ")").join(", ") + ".";
}

const engineerRules = [
    {
        test: /\b(salary|pay|raise|bonus|appraisal)\b/,
        reply: ["That's one for HR, not me.", "I just write code. Ask HR about pay."]
    },
    { test: /\b(servers?|uptime|downtime|offline|outage|ping)\b/, reply: serverReply },
    { test: /\b(commits?|push(ed)?|pull request|prs?|merge[ds]?|branch(es)?|git)\b/, reply: commitReply },
    { test: /\b(projects?|codenames?|milestones?|roadmap|sprints?|portfolio)\b/, reply: projectReply },
    { test: /\b(clients?|customers?|accounts?|contracts?)\b/, reply: clientReply },
    { test: /\b(assets?|laptops?|hardware|equipment|inventory|licen[sc]es?)\b/, reply: assetReply },
    { test: /\b(departments?|depts?|headcount|org chart)\b/, reply: departmentReply },
    {
        test: /\b(bugs?|errors?|crash(es|ed)?|issues?|broken|fail(s|ed|ing)?|exception)\b/,
        reply: [
            "Can you share the stack trace? Does it reproduce on a clean build?",
            "Classic. Check the logs first. I'd bet on a null reference.",
            "Open a ticket with repro steps and I'll look after standup."
        ]
    },
    {
        test: /\b(deploy(ed|ment|ing)?|release|prod|production|ship(ping)?)\b/,
        reply: [
            "Is staging green? Don't push to prod until it is.",
            "Run the pipeline first. If it passes, ship it. And never on a Friday.",
            "Make sure there's a rollback plan before we deploy."
        ]
    },
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
        test: /\b(deadline|eta|when|done|ready|status)\b/,
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
            "Hey! " + firstName(person) + " here. What's up?",
            "Hello! Currently waiting on a build, so go ahead.",
            "Hey, give me a sec, just finishing a merge."
        ])
    }
];

const engineerFallbacks = [
    "Interesting. Can you give me more context?",
    "Let me check and get back to you.",
    "I'll look into it. Can you open a ticket so it doesn't get lost?",
    "Works on my machine. Can you send the exact steps?"
];

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
    const investor = person.kind === "investor";
    const rules = investor ? investorRules : engineerRules;
    const fallbacks = investor ? investorFallbacks : engineerFallbacks;
    const lower = text.toLowerCase();

    // a named project / client / asset tag / department gets a direct answer
    const found = lookupRecord(lower);
    if (found) return investor ? investorRecordReply(found) : recordReply(found);

    for (const rule of rules) {
        if (rule.test.test(lower)) {
            return typeof rule.reply === "function" ? rule.reply(person) : pick(rule.reply);
        }
    }
    return pick(fallbacks);
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
    renderMessages();

    const responders = isGroupChat()
        ? [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_GROUP_REPLIES)
        : pool;

    responders.forEach((person, i) => {
        scheduleReply(key, person, text, 800 + i * 900 + Math.random() * 700);
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