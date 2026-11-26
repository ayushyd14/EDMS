// Shared by every page: login guard, table tools (scroll box / search / sort / CSV) and the chat user pill.
// Add data-public to the script tag on pages that must work without login (login.html).
(() => {
    const script = document.currentScript;
    const base = script ? script.src : location.href;
    const loginUrl = new URL("../html/login.html", base).href;
    const homeUrl = new URL("../html/dashboard.html", base).href;
    const profileUrl = new URL("../html/profile.html", base).href;

    const read = (key, fallback) => {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            return v === null || v === undefined ? fallback : v;
        } catch (e) {
            return fallback;
        }
    };

    const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

    const Auth = {
        loginUrl: loginUrl,
        homeUrl: homeUrl,
        profileUrl: profileUrl,
        same: same,

        employees() {
            const data = read("employeeData", []);
            return Array.isArray(data) ? data : [];
        },

        current() {
            const session = read("authUser", null);
            if (!session || !session.empCode) return null;
            return Auth.employees().find(e => same(e.empCode, session.empCode)) || null;
        },

        login(emp) {
            localStorage.setItem("authUser", JSON.stringify({ empCode: emp.empCode, at: Date.now() }));
        },

        logout() {
            localStorage.removeItem("authUser");
            location.href = loginUrl;
        },

        // profile picture from PROFILE_PICS (js/pics.js), keyed by Emp Code or full name
        setAvatar(el, user) {
            const pics = typeof PROFILE_PICS !== "undefined" ? PROFILE_PICS : {};
            const lookup = {};
            Object.keys(pics).forEach(k => { lookup[String(k).trim().toLowerCase()] = pics[k]; });
            const url = lookup[String(user.empCode).trim().toLowerCase()] || lookup[String(user.fullName).trim().toLowerCase()];
            if (!url) return;
            const img = new Image();
            img.onload = () => { el.style.backgroundImage = "url(" + JSON.stringify(url) + ")"; };
            img.src = url;
        },
    };
    window.Auth = Auth;

    if (script && script.hasAttribute("data-public")) return;

    // login guard
    if (!Auth.current()) {
        document.documentElement.style.display = "none";
        location.replace(loginUrl);
        return;
    }

    document.addEventListener("DOMContentLoaded", () => {
        enhanceTables();
        initUserPill();
    });

    // ---------- tables: scroll box, search, sort, CSV ----------

    function parseNum(text) {
        const m = String(text).trim().match(/^\$?\s*(-?[\d,]*\.?\d+)\s*([KMBT])?%?$/i);
        if (!m) return null;
        const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[(m[2] || "").toUpperCase()] || 1;
        return Number(m[1].replace(/,/g, "")) * mult;
    }

    function compare(a, b) {
        const x = parseNum(a);
        const y = parseNum(b);
        if (x !== null && y !== null) return x - y;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    }

    function enhanceTables() {
        document.querySelectorAll("table.list").forEach(table => {
            const tbody = table.tBodies[0];
            const headers = [...table.tHead.rows[0].cells];
            const dataCols = headers.map((h, i) => i).filter(i => !/edit/i.test(headers[i].textContent));

            const box = document.createElement("div");
            box.className = "table-box";

            const bar = document.createElement("div");
            bar.className = "table-toolbar";

            const search = document.createElement("input");
            search.type = "text";
            search.className = "table-search";
            search.placeholder = "Search this table...";
            search.autocomplete = "off";

            const count = document.createElement("span");
            count.className = "table-count";

            const exportBtn = document.createElement("button");
            exportBtn.type = "button";
            exportBtn.className = "tool-btn";
            exportBtn.textContent = "Export CSV";

            bar.append(search, count, exportBtn);

            const scroll = document.createElement("div");
            scroll.className = "table-scroll";

            table.parentNode.insertBefore(box, table);
            scroll.appendChild(table);
            box.append(bar, scroll);

            const apply = () => {
                const q = search.value.trim().toLowerCase();
                const rows = [...tbody.rows];
                let shown = 0;
                rows.forEach(r => {
                    const text = dataCols.map(i => (r.cells[i] ? r.cells[i].textContent : "")).join(" ").toLowerCase();
                    const ok = !q || text.includes(q);
                    r.hidden = !ok;
                    if (ok) shown++;
                });
                if (rows.length === 0) count.textContent = "No records yet";
                else if (q) count.textContent = shown + " of " + rows.length + " shown";
                else count.textContent = rows.length + (rows.length === 1 ? " record" : " records");
            };

            search.addEventListener("input", apply);
            new MutationObserver(apply).observe(tbody, { childList: true, subtree: true });
            apply();

            // click a header to sort
            headers.forEach((th, i) => {
                if (!dataCols.includes(i)) return;
                th.classList.add("sortable");
                th.title = "Click to sort";
                th.addEventListener("click", () => {
                    const dir = th.dataset.sort === "asc" ? "desc" : "asc";
                    headers.forEach(h => { delete h.dataset.sort; });
                    th.dataset.sort = dir;
                    [...tbody.rows]
                        .sort((a, b) => compare(a.cells[i].textContent, b.cells[i].textContent) * (dir === "asc" ? 1 : -1))
                        .forEach(r => tbody.appendChild(r));
                });
            });

            // export what the table holds
            exportBtn.addEventListener("click", () => {
                const esc = (v) => {
                    let s = String(v);
                    if (/^[=+@]/.test(s)) s = "'" + s;
                    return '"' + s.replace(/"/g, '""') + '"';
                };
                const lines = [dataCols.map(i => esc(headers[i].textContent)).join(",")];
                [...tbody.rows].forEach(r => lines.push(dataCols.map(i => esc(r.cells[i].textContent)).join(",")));

                const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = (document.title.split("|")[0].trim().replace(/\s+/g, "-").toLowerCase() || "table") + ".csv";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(link.href);
            });
        });
    }

    // ---------- chat: user pill ----------

    function initUserPill() {
        const pill = document.getElementById("userPill");
        if (!pill) return;

        const user = Auth.current();
        const menu = document.getElementById("userMenu");

        document.getElementById("userName").textContent = user.fullName;
        Auth.setAvatar(document.getElementById("userAvatar"), user);

        pill.addEventListener("click", (event) => {
            event.stopPropagation();
            menu.hidden = !menu.hidden;
            pill.setAttribute("aria-expanded", String(!menu.hidden));
        });
        document.addEventListener("click", () => { menu.hidden = true; });
        document.getElementById("logoutBtn").addEventListener("click", Auth.logout);
    }
})();