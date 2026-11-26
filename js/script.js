const fullName = document.getElementById("fullName");
const empCode = document.getElementById("empCode");
const designation = document.getElementById("designation");
const country = document.getElementById("country");
const doj = document.getElementById("doj");
const salary = document.getElementById("salary");
const employeeList = document.getElementById("employeeList").querySelector("tbody");
const form = document.getElementById("form")

let selectedRow = null;

form.addEventListener("submit", (event) => {
    event.preventDefault();
    onFormSubmit()
});

const onFormSubmit = () => {
    if(!fullName.value.trim() || !empCode.value.trim() || !designation.value.trim() || !country.value.trim() || !doj.value.trim() || !salary.value.trim() ){
        alert("Please fill in all Fields.");
        return;
    }

    const code = empCode.value.trim().toLowerCase();
    const duplicate = [...employeeList.rows].some(r => r !== selectedRow && r.cells[1].textContent.trim().toLowerCase() === code);
    if(duplicate){
        alert("An employee with this Emp Code already exists.");
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
        designation: designation.value.trim(),
        country: country.value.trim(),
        doj: doj.value.trim(),
        salary: salary.value.trim(),
    };
};

const insertData = (data) => {
    const newRow = employeeList.insertRow();

    newRow.insertCell(0).textContent = data.fullName;
    newRow.insertCell(1).textContent = data.empCode;
    newRow.insertCell(2).textContent = data.designation || "";
    newRow.insertCell(3).textContent = data.country;
    newRow.insertCell(4).textContent = data.doj || "";
    newRow.insertCell(5).textContent = data.salary;

    let cell7 = newRow.insertCell(6);

    const editBtn = document.createElement("span");
    editBtn.textContent = "Edit";
    editBtn.classList.add("btn");
    editBtn.addEventListener("click", () => onEdit(newRow));

    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("btn");
    deleteBtn.addEventListener("click", () => onDelete(newRow));

    cell7.appendChild(editBtn);
    cell7.appendChild(deleteBtn);

    saveToLocalStorage();
};

const resetForm = () => {
    fullName.value = "";
    empCode.value = "";
    designation.value = "";
    country.value = "";
    doj.value = "";
    salary.value = "";
    selectedRow = null;
};

const onEdit = (td) => {
    selectedRow = td;
    fullName.value = selectedRow.cells[0].textContent;
    empCode.value = selectedRow.cells[1].textContent;
    designation.value = selectedRow.cells[2].textContent;
    country.value = selectedRow.cells[3].textContent;
    doj.value = selectedRow.cells[4].textContent;
    salary.value = selectedRow.cells[5].textContent;
}

const updateData = (formData) => {
    // keep the login session if you edit your own Emp Code
    const wasMe = Auth.current() && Auth.same(Auth.current().empCode, selectedRow.cells[1].textContent);

    selectedRow.cells[0].textContent = formData.fullName;
    selectedRow.cells[1].textContent = formData.empCode;
    selectedRow.cells[2].textContent = formData.designation;
    selectedRow.cells[3].textContent = formData.country;
    selectedRow.cells[4].textContent = formData.doj;
    selectedRow.cells[5].textContent = formData.salary;
    selectedRow = null;

    saveToLocalStorage();
    if(wasMe) Auth.login({ empCode: formData.empCode });
}

const onDelete = (row) => {
    const isSelf = Auth.current() && Auth.same(Auth.current().empCode, row.cells[1].textContent);
    const message = isSelf
        ? "This is your own record. Deleting it will log you out. Continue?"
        : "Are you sure you want to delete this record?";

    if(confirm(message)){
        row.remove();
        resetForm();
        saveToLocalStorage();
        if(isSelf) Auth.logout();
    }
};

// ---- localStorage persistence ----

const saveToLocalStorage = () => {
    const rows = [...employeeList.querySelectorAll("tr")];
    const data = rows.map(row => ({
        fullName: row.cells[0].textContent,
        empCode: row.cells[1].textContent,
        designation: row.cells[2].textContent,
        country: row.cells[3].textContent,
        doj: row.cells[4].textContent,
        salary: row.cells[5].textContent,
    }));
    localStorage.setItem("employeeData", JSON.stringify(data));
};

const loadFromLocalStorage = () => {
    const data = JSON.parse(localStorage.getItem("employeeData")) || [];
    data.forEach(item => insertData(item));
};

loadFromLocalStorage();