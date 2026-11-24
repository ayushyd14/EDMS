createDatabase({
    storageKey: "assetData",
    tableId: "assetList",
    unique: "assetTag",
    uniqueMessage: "An asset with this tag already exists.",
    fields: [
        { id: "assetTag", upper: true },
        { id: "assetName" },
        { id: "category" },
        { id: "assignedTo", optional: true },
        { id: "purchaseDate" },
        { id: "status", badge: true },
    ],
});