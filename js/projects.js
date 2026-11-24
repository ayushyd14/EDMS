createDatabase({
    storageKey: "projectData",
    tableId: "projectList",
    unique: "codename",
    uniqueMessage: "A project with this codename already exists.",
    fields: [
        { id: "codename", upper: true },
        { id: "projectName" },
        { id: "lead" },
        { id: "priority", badge: true },
        { id: "status", badge: true },
        { id: "progress" },
        { id: "deadline" },
    ],
    validate: (d) => {
        const p = Number(d.progress);
        return isNaN(p) || p < 0 || p > 100 ? "Progress must be between 0 and 100." : null;
    },
});