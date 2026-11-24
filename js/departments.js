createDatabase({
    storageKey: "departmentData",
    tableId: "departmentList",
    unique: "deptCode",
    uniqueMessage: "A department with this code already exists.",
    fields: [
        { id: "deptName" },
        { id: "deptCode", upper: true },
        { id: "head" },
        { id: "location" },
        { id: "budget" },
    ],
    validate: (d) => (Number(d.budget) < 0 ? "Budget can't be negative." : null),
});