createDatabase({
    storageKey: "clientData",
    tableId: "clientList",
    unique: "clientName",
    uniqueMessage: "This client already exists.",
    fields: [
        { id: "clientName" },
        { id: "industry" },
        { id: "country" },
        { id: "contactPerson" },
        { id: "contractValue" },
        { id: "status", badge: true },
    ],
    validate: (d) => (Number(d.contractValue) < 0 ? "Contract value can't be negative." : null),
});