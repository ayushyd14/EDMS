// ============================================================
//  PROFILE PICTURES: edit these two lists, nothing else.
//  Key = Emp Code OR full name (not case sensitive) / group name.
//  Value = image path, relative to the html/ pages ("../images/...").
//  Anyone not listed, or with a wrong path, keeps the grey placeholder.
// ============================================================
const PROFILE_PICS = {
    "190021": "../images/190021.jpg",   // Brad Q.
    "210219": "../images/210219.jpg",   // V.C. Chandrapaul
    "180006": "../images/180006.jpg",   // Chris Harrison
    "020002": "../images/020002.jpg",   // Zuvloć Romilly
    "150028": "../images/150028.jpg",   // Leo Cooper
    "090007": "../images/090007.jpg",   // Vishy Sharma
    "970001": "../images/970001.jpg",   // Edwin Foster
    "030009": "../images/030009.jpg",   // Shikaku Nakuru
};

const GROUP_PICS = {
    "All Employees": "../images/all-employees.png",
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

const GROUP_KEY = "__all__";     // built-in "All Employees" group
const GROUP_PREFIX = "g:";       // custom groups are stored as g:<id>
const MAX_MESSAGES = 200;        // per conversation
const MAX_GROUP_REPLIES = 3;     // how many members answer in a group chat

let employees = loadEmployees();
let groups = loadGroups();
let conversations = loadConversations();
let activeKey = GROUP_KEY;
let filterText = "";
const pending = {};              // conversationKey -> names currently "typing"

let editingGroupId = null;       // null = creating a new group
let modalSelected = new Set();   // empCodes ticked in the group modal

// ---------- profile pictures (configured in js/profile-pics.js) ----------

function normalizeKey(text) {
    return String(text).trim().toLowerCase();
}

function buildLookup(source) {
    const lookup = {};
    Object.keys(source || {}).forEach(k => { lookup[normalizeKey(k)] = source[k]; });
    return lookup;
}

const employeePics = buildLookup(typeof PROFILE_PICS !== "undefined" ? PROFILE_PICS : {});
const groupPics = buildLookup(typeof GROUP_PICS !== "undefined" ? GROUP_PICS : {});

function getEmployeePic(emp) {
    return employeePics[normalizeKey(emp.empCode)] || employeePics[normalizeKey(emp.fullName)] || null;
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

function loadEmployees() {
    const data = loadJSON("employeeData", []);
    return Array.isArray(data) ? data : [];
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

function getActiveGroup() {
    if (!isCustomGroupKey(activeKey)) return null;
    return groups.find(g => GROUP_PREFIX + g.id === activeKey) || null;
}

function getActiveEmployee() {
    if (activeKey === GROUP_KEY || isCustomGroupKey(activeKey)) return null;
    return employees.find(e => e.empCode === activeKey) || null;
}

function getGroupMembers(group) {
    return employees.filter(e => group.members.includes(e.empCode));
}

function isGroupChat() {
    return activeKey === GROUP_KEY || isCustomGroupKey(activeKey);
}

// Who can answer in the open conversation
function getResponderPool() {
    if (activeKey === GROUP_KEY) return employees;
    const group = getActiveGroup();
    if (group) return getGroupMembers(group);
    const emp = getActiveEmployee();
    return emp ? [emp] : [];
}

function ensureValidActiveKey() {
    if (activeKey === GROUP_KEY) return;
    if (isCustomGroupKey(activeKey) ? !getActiveGroup() : !getActiveEmployee()) {
        activeKey = GROUP_KEY;
    }
}

function matchesQuery(emp, query) {
    return !query ||
        (emp.fullName || "").toLowerCase().includes(query) ||
        (emp.empCode || "").toLowerCase().includes(query) ||
        (emp.country || "").toLowerCase().includes(query);
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

function addNote(text) {
    const note = document.createElement("li");
    note.className = "contact-empty";
    note.textContent = text;
    contactList.appendChild(note);
}

function renderContacts() {
    contactList.replaceChildren();

    contactList.appendChild(buildContact("All Employees", GROUP_KEY, true, getGroupPic("All Employees")));

    const query = filterText.trim().toLowerCase();

    const groupMatches = groups.filter(g => !query || g.name.toLowerCase().includes(query));
    groupMatches.forEach(g => contactList.appendChild(buildContact(g.name, GROUP_PREFIX + g.id, true, getGroupPic(g.name))));

    if (employees.length === 0) {
        addNote("No employees yet. Add some on the Employee Database page.");
        return;
    }

    const matches = employees.filter(e => matchesQuery(e, query));
    if (matches.length === 0 && groupMatches.length === 0) {
        addNote("Nothing matches your filter.");
        return;
    }

    matches.forEach(emp => contactList.appendChild(buildContact(emp.fullName, emp.empCode, false, getEmployeePic(emp))));
}

function renderHeader() {
    const group = getActiveGroup();
    const emp = getActiveEmployee();

    chatAvatar.className = "avatar avatar-lg" + (isGroupChat() ? " avatar-group" : "");
    chatAvatar.style.backgroundImage = "";
    delete chatAvatar.dataset.pic;

    const headerPic = group ? getGroupPic(group.name)
        : emp ? getEmployeePic(emp)
        : getGroupPic("All Employees");
    if (headerPic) setAvatarImage(chatAvatar, headerPic);

    if (group) {
        const names = getGroupMembers(group).map(m => m.fullName);
        chatTitle.textContent = group.name;
        chatSub.textContent = names.length ? "Members: " + names.join(", ") : "No members left in this group";
        chatSub.hidden = false;
    } else {
        chatTitle.textContent = emp ? emp.fullName : "All Employees";
        chatSub.textContent = "";
        chatSub.hidden = true;
    }

    editGroupBtn.hidden = !group;
    deleteGroupBtn.hidden = !group;
}

function renderMessages() {
    chatBox.replaceChildren();

    const list = conversations[activeKey] || [];
    const pool = getResponderPool();

    if (employees.length === 0) {
        showEmpty("No employees to chat with yet. Add some on the Employee Database page.");
    } else if (pool.length === 0) {
        showEmpty("This group has no employees left. Use Edit Group to add members.");
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
    return employees.filter(e => matchesQuery(e, query));
}

function updateSelectedCount() {
    selectedCount.textContent = "(" + modalSelected.size + " selected)";
}

function renderMemberList() {
    memberList.replaceChildren();
    updateSelectedCount();

    if (employees.length === 0) {
        const none = document.createElement("div");
        none.className = "member-empty";
        none.textContent = "No employees yet. Add some on the Employee Database page.";
        memberList.appendChild(none);
        return;
    }

    const shown = getShownMembers();
    if (shown.length === 0) {
        const none = document.createElement("div");
        none.className = "member-empty";
        none.textContent = "No employees match.";
        memberList.appendChild(none);
        return;
    }

    shown.forEach(emp => {
        const row = document.createElement("label");
        row.className = "member";

        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = modalSelected.has(emp.empCode);
        box.addEventListener("change", () => {
            if (box.checked) modalSelected.add(emp.empCode);
            else modalSelected.delete(emp.empCode);
            updateSelectedCount();
        });

        const name = document.createElement("span");
        name.textContent = emp.fullName;

        const country = document.createElement("small");
        country.textContent = emp.country;

        row.appendChild(box);
        row.appendChild(name);
        row.appendChild(country);
        memberList.appendChild(row);
    });
}

function saveGroup() {
    const name = groupNameInput.value.trim();
    if (!name) {
        alert("Please enter a group name.");
        return;
    }

    const members = employees.filter(e => modalSelected.has(e.empCode)).map(e => e.empCode);
    if (members.length === 0) {
        alert("Pick at least one employee.");
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

// ---------- engineer replies ----------

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function firstName(emp) {
    return (emp.fullName || "").split(" ")[0] || "me";
}

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

const rules = [
    {
        test: /\b(salary|pay|raise|bonus|appraisal)\b/,
        reply: ["That's one for HR, not me.", "I just write code. Ask HR about pay."]
    },
    { test: /\b(servers?|uptime|downtime|offline|outage|ping)\b/, reply: serverReply },
    { test: /\b(commits?|push(ed)?|pull request|prs?|merge[ds]?|branch(es)?|git)\b/, reply: commitReply },
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
        reply: emp => pick([
            "Hey! " + firstName(emp) + " here. What's up?",
            "Hello! Currently waiting on a build, so go ahead.",
            "Hey, give me a sec, just finishing a merge."
        ])
    }
];

const fallbackReplies = [
    "Interesting. Can you give me more context?",
    "Let me check and get back to you.",
    "I'll look into it. Can you open a ticket so it doesn't get lost?",
    "Works on my machine. Can you send the exact steps?"
];

function getReply(emp, text) {
    const lower = text.toLowerCase();
    for (const rule of rules) {
        if (rule.test.test(lower)) {
            return typeof rule.reply === "function" ? rule.reply(emp) : pick(rule.reply);
        }
    }
    return pick(fallbackReplies);
}

function scheduleReply(key, emp, userText, delay) {
    if (!pending[key]) pending[key] = [];
    pending[key].push(emp.fullName);
    updateTyping();

    setTimeout(() => {
        const names = pending[key] || [];
        const index = names.indexOf(emp.fullName);
        if (index !== -1) names.splice(index, 1);

        addMessage(key, { mine: false, from: emp.fullName, text: getReply(emp, userText), time: Date.now() });

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

    responders.forEach((emp, i) => {
        scheduleReply(key, emp, text, 800 + i * 900 + Math.random() * 700);
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
    getShownMembers().forEach(e => modalSelected.add(e.empCode));
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

// Keep in sync with other tabs (employees, groups and messages)
window.addEventListener("storage", (event) => {
    if (event.key === "employeeData") {
        employees = loadEmployees();
        ensureValidActiveKey();
        renderContacts();
        renderHeader();
        renderMessages();
        if (!groupModal.hidden) renderMemberList();
    } else if (event.key === "chatGroups") {
        groups = loadGroups();
        ensureValidActiveKey();
        renderContacts();
        renderHeader();
        renderMessages();
    } else if (event.key === "chatData") {
        conversations = loadConversations();
        renderMessages();
    }
});

selectConversation(GROUP_KEY);
