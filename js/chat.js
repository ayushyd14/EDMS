const filterInput = document.getElementById("filterInput");
const contactList = document.getElementById("contactList");
const chatTitle = document.getElementById("chatTitle");
const chatBox = document.getElementById("chatBox");
const typingLine = document.getElementById("typing");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const clearChat = document.getElementById("clearChat");

const GROUP_KEY = "__all__";
const MAX_MESSAGES = 200;        // per conversation
const MAX_GROUP_REPLIES = 3;     // how many employees answer in "All Employees"

let employees = loadEmployees();
let conversations = loadConversations();
let activeKey = GROUP_KEY;
let filterText = "";
const pending = {};              // conversationKey -> names currently "typing"

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

// ---------- rendering ----------

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getActiveEmployee() {
    if (activeKey === GROUP_KEY) return null;
    return employees.find(e => e.empCode === activeKey) || null;
}

function buildContact(name, key) {
    const item = document.createElement("li");
    item.className = "contact" + (activeKey === key ? " active" : "");

    const avatar = document.createElement("span");
    avatar.className = "avatar";

    const label = document.createElement("span");
    label.className = "contact-name";
    label.textContent = name;

    item.appendChild(avatar);
    item.appendChild(label);
    item.addEventListener("click", () => selectConversation(key));
    return item;
}

function renderContacts() {
    contactList.replaceChildren();

    contactList.appendChild(buildContact("All Employees", GROUP_KEY));

    if (employees.length === 0) {
        const empty = document.createElement("li");
        empty.className = "contact-empty";
        empty.textContent = "No employees yet. Add some on the Employee Database page.";
        contactList.appendChild(empty);
        return;
    }

    const query = filterText.trim().toLowerCase();
    const matches = employees.filter(e =>
        !query ||
        (e.fullName || "").toLowerCase().includes(query) ||
        (e.empCode || "").toLowerCase().includes(query) ||
        (e.country || "").toLowerCase().includes(query)
    );

    if (matches.length === 0) {
        const none = document.createElement("li");
        none.className = "contact-empty";
        none.textContent = "No employees match your filter.";
        contactList.appendChild(none);
        return;
    }

    matches.forEach(emp => contactList.appendChild(buildContact(emp.fullName, emp.empCode)));
}

function renderHeader() {
    const emp = getActiveEmployee();
    chatTitle.textContent = emp ? emp.fullName : "All Employees";
}

function renderMessages() {
    chatBox.replaceChildren();

    const list = conversations[activeKey] || [];

    if (employees.length === 0) {
        showEmpty("No employees to chat with yet. Add some on the Employee Database page.");
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

    messageInput.disabled = employees.length === 0;
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
    if (!text || employees.length === 0) return;

    const key = activeKey;
    addMessage(key, { mine: true, from: "You", text: text, time: Date.now() });
    messageInput.value = "";
    renderMessages();

    let responders;
    if (key === GROUP_KEY) {
        responders = [...employees].sort(() => Math.random() - 0.5).slice(0, MAX_GROUP_REPLIES);
    } else {
        const emp = getActiveEmployee();
        responders = emp ? [emp] : [];
    }

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

// Keep in sync with other tabs (e.g. employees added on the Employee Database page)
window.addEventListener("storage", (event) => {
    if (event.key === "employeeData") {
        employees = loadEmployees();
        if (activeKey !== GROUP_KEY && !getActiveEmployee()) activeKey = GROUP_KEY;
        renderContacts();
        renderHeader();
        renderMessages();
    } else if (event.key === "chatData") {
        conversations = loadConversations();
        renderMessages();
    }
});

selectConversation(GROUP_KEY);
