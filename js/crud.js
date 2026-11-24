// Shared CRUD engine for Projects, Clients, Departments and Assets.
// config: { storageKey, tableId, fields: [{ id, badge?, upper?, optional? }] (column order),
//           unique?: fieldId, uniqueMessage?, validate?(data) -> error string | null }

const createDatabase = (config) => {
    const form = document.getElementById("form");
    const list = document.getElementById(config.tableId).querySelector("tbody");
    const inputs = {};
    config.fields.forEach(f => { inputs[f.id] = document.getElementById(f.id); });

    let selectedRow = null;

    const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const readFormData = () => {
        const data = {};
        config.fields.forEach(f => {
            const value = inputs[f.id].value.trim();
            data[f.id] = f.upper ? value.toUpperCase() : value;
        });
        return data;
    };

    const fillCell = (cell, field, value) => {
        cell.textContent = "";
        if (field.badge && value) {
            const badge = document.createElement("span");
            badge.className = "badge badge-" + slug(value);
            badge.textContent = value;
            cell.appendChild(badge);
        } else {
            cell.textContent = value;
        }
    };

    const insertData = (data, shouldSave = true) => {
        const newRow = list.insertRow();
        config.fields.forEach((f, i) => fillCell(newRow.insertCell(i), f, data[f.id] || ""));

        const actions = newRow.insertCell(config.fields.length);

        const editBtn = document.createElement("span");
        editBtn.textContent = "Edit";
        editBtn.classList.add("btn");
        editBtn.addEventListener("click", () => onEdit(newRow));

        const deleteBtn = document.createElement("span");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("btn");
        deleteBtn.addEventListener("click", () => onDelete(newRow));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        if (shouldSave) saveToLocalStorage();
    };

    const updateData = (data) => {
        config.fields.forEach((f, i) => fillCell(selectedRow.cells[i], f, data[f.id]));
        selectedRow = null;
        saveToLocalStorage();
    };

    const resetForm = () => {
        config.fields.forEach(f => { inputs[f.id].value = ""; });
        selectedRow = null;
    };

    const onEdit = (row) => {
        selectedRow = row;
        config.fields.forEach((f, i) => { inputs[f.id].value = row.cells[i].textContent; });
    };

    const onDelete = (row) => {
        if (confirm("Are you sure you want to delete this record?")) {
            row.remove();
            resetForm();
            saveToLocalStorage();
        }
    };

    const onFormSubmit = () => {
        if (config.fields.some(f => !f.optional && !inputs[f.id].value.trim())) {
            alert("Please fill in all Fields.");
            return;
        }

        const data = readFormData();

        if (config.unique) {
            const index = config.fields.findIndex(f => f.id === config.unique);
            const wanted = data[config.unique].toLowerCase();
            const duplicate = [...list.rows].some(r =>
                r !== selectedRow && r.cells[index].textContent.trim().toLowerCase() === wanted);
            if (duplicate) {
                alert(config.uniqueMessage || "This entry already exists.");
                return;
            }
        }

        if (config.validate) {
            const error = config.validate(data);
            if (error) {
                alert(error);
                return;
            }
        }

        if (selectedRow == null) {
            insertData(data);
        } else {
            updateData(data);
        }
        resetForm();
    };

    // ---- localStorage persistence ----

    const saveToLocalStorage = () => {
        const data = [...list.rows].map(row => {
            const item = {};
            config.fields.forEach((f, i) => { item[f.id] = row.cells[i].textContent; });
            return item;
        });
        localStorage.setItem(config.storageKey, JSON.stringify(data));
    };

    const loadFromLocalStorage = () => {
        let data = [];
        try {
            data = JSON.parse(localStorage.getItem(config.storageKey)) || [];
        } catch (e) {
            data = [];
        }
        data.forEach(item => insertData(item, false));
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        onFormSubmit();
    });

    loadFromLocalStorage();
};