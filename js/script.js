const fullName = document.getElementById("fullName");
const empCode = document.getElementById("empCode");
const country = document.getElementById("country");
const salary = document.getElementById("salary");
const employeeList = document.getElementById("employeeList").querySelector("tbody");
const form = document.getElementById("form")

let selectedRow = null;

form.addEventListener("submit", (event) => {
    event.preventDefault();
    onFormSubmit()
});

const onFormSubmit = () => {
    if(!fullName.value.trim() || !empCode.value.trim() || !country.value.trim() || !salary.value.trim() ){
        alert("Please fill in all Fields.");
        return;
    }

    const formData = readFormData();

    if(selectedRow == null){
        insertData(formData);
    }else{
        updateData(formData);
    }
    resetForm();
};

const readFormData = () => {
    return{
        fullName: fullName.value.trim(),
        empCode: empCode.value.trim(),
        country: country.value.trim(),
        salary: salary.value.trim(),
    };
};

const insertData = (data) => {
    const newRow = employeeList.insertRow();

    let cell1 = newRow.insertCell(0);
    cell1.innerHTML = data.fullName;

    let cell2 = newRow.insertCell(1);
    cell2.innerHTML = data.empCode;

    let cell3 = newRow.insertCell(2);
    cell3.innerHTML = data.country;

    let cell4 = newRow.insertCell(3);
    cell4.innerHTML = data.salary;

    let cell5 = newRow.insertCell(4);

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

    saveToLocalStorage();
};

const resetForm = () => {
    fullName.value = "";
    empCode.value = "";
    country.value = "";
    salary.value = "";
    selectedRow = null;
};

const onEdit = (td) => {
    selectedRow = td;
    fullName.value = selectedRow.cells[0].textContent;
    empCode.value = selectedRow.cells[1].textContent;
    country.value = selectedRow.cells[2].textContent;
    salary.value = selectedRow.cells[3].textContent;
}

const updateData = (formData) => {
    selectedRow.cells[0].textContent = formData.fullName;
    selectedRow.cells[1].textContent = formData.empCode;
    selectedRow.cells[2].textContent = formData.country;
    selectedRow.cells[3].textContent = formData.salary;
    selectedRow = null;

    saveToLocalStorage();
}

const onDelete = (row) => {
    if(confirm("Are you sure you want to delete this record?")){
        row.remove();
        resetForm();
        saveToLocalStorage();
    }
};

// ---- localStorage persistence (new) ----

const saveToLocalStorage = () => {
    const rows = [...employeeList.querySelectorAll("tr")];
    const data = rows.map(row => ({
        fullName: row.cells[0].textContent,
        empCode: row.cells[1].textContent,
        country: row.cells[2].textContent,
        salary: row.cells[3].textContent,
    }));
    localStorage.setItem("employeeData", JSON.stringify(data));
};

const loadFromLocalStorage = () => {
    const data = JSON.parse(localStorage.getItem("employeeData")) || [];
    data.forEach(insertData);
};

loadFromLocalStorage();
