const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const userNameInput = document.getElementById("userName");
const clearChat = document.getElementById("clearChat");

const MAX_MESSAGES = 200;

let messages = loadMessages();
let currentUser = localStorage.getItem("chatUser") || "Guest";
userNameInput.value = currentUser;

function loadMessages() {
    try {
        return JSON.parse(localStorage.getItem("chatData")) || [];
    } catch (e) {
        return [];
    }
}

function saveMessages() {
    localStorage.setItem("chatData", JSON.stringify(messages));
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMessages() {
    chatBox.replaceChildren();

    if (messages.length === 0) {
        const empty = document.createElement("div");
        empty.className = "chat-empty";
        empty.textContent = "No messages yet. Say something!";
        chatBox.appendChild(empty);
        return;
    }

    messages.forEach(m => {
        const wrapper = document.createElement("div");
        wrapper.className = "msg" + (m.user === currentUser ? " mine" : "");

        const meta = document.createElement("div");
        meta.className = "msg-meta";
        meta.textContent = m.user + " · " + formatTime(m.time);

        const text = document.createElement("div");
        text.className = "msg-text";
        text.textContent = m.text;

        wrapper.appendChild(meta);
        wrapper.appendChild(text);
        chatBox.appendChild(wrapper);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    if (!text) return;

    // Re-read first so messages from other tabs aren't overwritten
    messages = loadMessages();
    messages.push({ user: currentUser, text: text, time: Date.now() });
    if (messages.length > MAX_MESSAGES) {
        messages = messages.slice(-MAX_MESSAGES);
    }

    saveMessages();
    messageInput.value = "";
    renderMessages();
});

userNameInput.addEventListener("change", () => {
    currentUser = userNameInput.value.trim() || "Guest";
    userNameInput.value = currentUser;
    localStorage.setItem("chatUser", currentUser);
    renderMessages();
});

clearChat.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the whole chat?")) {
        messages = [];
        saveMessages();
        renderMessages();
    }
});

// Live updates from other tabs in this browser
window.addEventListener("storage", (event) => {
    if (event.key === "chatData") {
        messages = loadMessages();
        renderMessages();
    }
});

renderMessages();