const serverName = document.getElementById("serverName");
const ipAddress = document.getElementById("ipAddress");
const location_ = document.getElementById("location");
const status_ = document.getElementById("status");
const serverList = document.getElementById("serverList").querySelector("tbody");
const form = document.getElementById("form");

let selectedRow = null;

form.addEventListener("submit", (event) => {
    event.preventDefault();
    onFormSubmit();
});

const onFormSubmit = () => {
    if (!serverName.value.trim() || !ipAddress.value.trim() || !location_.value.trim() || !status_.value.trim()) {
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
        serverName: serverName.value.trim(),
        ipAddress: ipAddress.value.trim(),
        location: location_.value.trim(),
        status: status_.value.trim(),
    };
};

const insertData = (data, shouldSave = true) => {
    const newRow = serverList.insertRow();

    newRow.insertCell(0).textContent = data.serverName;
    newRow.insertCell(1).textContent = data.ipAddress;
    newRow.insertCell(2).textContent = data.location;
    newRow.insertCell(3).textContent = data.status;

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
    serverName.value = "";
    ipAddress.value = "";
    location_.value = "";
    status_.value = "";
    selectedRow = null;
};

const onEdit = (row) => {
    selectedRow = row;
    serverName.value = selectedRow.cells[0].textContent;
    ipAddress.value = selectedRow.cells[1].textContent;
    location_.value = selectedRow.cells[2].textContent;
    status_.value = selectedRow.cells[3].textContent;
};

const updateData = (formData) => {
    selectedRow.cells[0].textContent = formData.serverName;
    selectedRow.cells[1].textContent = formData.ipAddress;
    selectedRow.cells[2].textContent = formData.location;
    selectedRow.cells[3].textContent = formData.status;
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

// ---- localStorage persistence (separate key from the employee page) ----

const saveToLocalStorage = () => {
    const rows = [...serverList.querySelectorAll("tr")];
    const data = rows.map(row => ({
        serverName: row.cells[0].textContent,
        ipAddress: row.cells[1].textContent,
        location: row.cells[2].textContent,
        status: row.cells[3].textContent,
    }));
    localStorage.setItem("serverData", JSON.stringify(data));
};

const loadFromLocalStorage = () => {
    const data = JSON.parse(localStorage.getItem("serverData")) || [];
    data.forEach(item => insertData(item, false));
};

loadFromLocalStorage();