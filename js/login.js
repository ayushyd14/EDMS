const loginForm = document.getElementById("loginForm");
const setupForm = document.getElementById("setupForm");
const loginTitle = document.getElementById("loginTitle");
const loginNote = document.getElementById("loginNote");
const loginError = document.getElementById("loginError");
const setupError = document.getElementById("setupError");

const showError = (el, message) => {
    el.textContent = message;
    el.hidden = false;
};

const val = (id) => document.getElementById(id).value.trim();

// no employees yet: offer first-time setup instead of login
if (Auth.employees().length === 0) {
    loginForm.hidden = true;
    setupForm.hidden = false;
    loginTitle.textContent = "First-time Setup";
    loginNote.textContent = "No employees exist yet. Create the first account to get started.";
} else {
    loginNote.textContent = "Not on the list? Ask an employee to add you on the Employee Database page.";
}

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginError.hidden = true;

    const name = val("loginName");
    const code = val("loginCode");
    const doj = val("loginDoj");

    if (!name || !code || !doj) {
        showError(loginError, "Please fill in all Fields.");
        return;
    }

    const match = Auth.employees().find(e => Auth.same(e.fullName, name) && Auth.same(e.empCode, code));
    if (!match) {
        showError(loginError, "No employee matches that name and Emp Code.");
        return;
    }
    if (match.doj && match.doj !== doj) {
        showError(loginError, "Date of joining doesn't match our records.");
        return;
    }

    Auth.login(match);
    location.href = Auth.homeUrl;
});

setupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setupError.hidden = true;

    const emp = {
        fullName: val("setupName"),
        empCode: val("setupCode"),
        designation: val("setupDesignation"),
        country: val("setupCountry"),
        doj: val("setupDoj"),
        salary: val("setupSalary"),
    };

    if (Object.values(emp).some(v => !v)) {
        showError(setupError, "Please fill in all Fields.");
        return;
    }
    if (Number(emp.salary) < 0) {
        showError(setupError, "Salary can't be negative.");
        return;
    }

    localStorage.setItem("employeeData", JSON.stringify([emp]));
    Auth.login(emp);
    location.href = Auth.homeUrl;
});