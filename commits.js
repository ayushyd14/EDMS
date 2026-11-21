const commitMessage = document.getElementById("commitMessage");
const commitDate = document.getElementById("commitDate");
const author = document.getElementById("author");
const branch = document.getElementById("branch");
const commitList = document.getElementById("commitList").querySelector("tbody");
const form = document.getElementById("form");

let selectedRow = null;

form.addEventListener("submit", (event) => {
    event.preventDefault();
    onFormSubmit();
});

const onFormSubmit = () => {
    if (!commitMessage.value.trim() || !commitDate.value.trim() || !author.value.trim() || !branch.value.trim()) {
        alert("Please fill in all Fields.");
        return;
    }

    const formData = readFormData();

    if (selectedRow == null) {
        insertData(formData);
    } else {
        updateData(formData);
    }
    resetForm();
};

const readFormData = () => {
    return {
        commitMessage: commitMessage.value.trim(),
        commitDate: commitDate.value.trim(),
        author: author.value.trim(),
        branch: branch.value.trim(),
    };
};

const insertData = (data, shouldSave = true) => {
    const newRow = commitList.insertRow();

    newRow.insertCell(0).textContent = data.commitMessage;
    newRow.insertCell(1).textContent = data.commitDate;
    newRow.insertCell(2).textContent = data.author;
    newRow.insertCell(3).textContent = data.branch;

    const cell5 = newRow.insertCell(4);

    const editBtn = document.createElement("span");
    editBtn.textContent = "Edit";
    editBtn.classList.add("btn");
    editBtn.addEventListener("click", () => onEdit(newRow));

    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("btn");
    deleteBtn.addEventListener("click", () => onDelete(newRow));

    cell5.appendChild(editBtn);
    cell5.appendChild(deleteBtn);

    if (shouldSave) saveToLocalStorage();
};

const resetForm = () => {
    commitMessage.value = "";
    commitDate.value = "";
    author.value = "";
    branch.value = "";
    selectedRow = null;
};

const onEdit = (row) => {
    selectedRow = row;
    commitMessage.value = selectedRow.cells[0].textContent;
    commitDate.value = selectedRow.cells[1].textContent;
    author.value = selectedRow.cells[2].textContent;
    branch.value = selectedRow.cells[3].textContent;
};

const updateData = (formData) => {
    selectedRow.cells[0].textContent = formData.commitMessage;
    selectedRow.cells[1].textContent = formData.commitDate;
    selectedRow.cells[2].textContent = formData.author;
    selectedRow.cells[3].textContent = formData.branch;
    selectedRow = null;

    saveToLocalStorage();
};

const onDelete = (row) => {
    if (confirm("Are you sure you want to delete this record?")) {
        row.remove();
        resetForm();
        saveToLocalStorage();
    }
};

// ---- localStorage persistence (separate key from the other pages) ----

const saveToLocalStorage = () => {
    const rows = [...commitList.querySelectorAll("tr")];
    const data = rows.map(row => ({
        commitMessage: row.cells[0].textContent,
        commitDate: row.cells[1].textContent,
        author: row.cells[2].textContent,
        branch: row.cells[3].textContent,
    }));
    localStorage.setItem("commitData", JSON.stringify(data));
};

const loadFromLocalStorage = () => {
    const data = JSON.parse(localStorage.getItem("commitData")) || [];
    data.forEach(item => insertData(item, false));
};

loadFromLocalStorage();