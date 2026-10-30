const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Menu = require("../src/models/Menu");

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

function normalizeMongoUri(raw) {
    if (!raw) return raw;
    const match = raw.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^@]+)$/);
    if (!match) return raw;

    const [, prefix, username, password, host] = match;
    return `${prefix}${username}:${encodeURIComponent(decodeURIComponent(password))}@${host}`;
}

async function main() {
    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
        throw new Error("MONGODB_URI is not configured in backend/.env.");
    }

    await mongoose.connect(normalizeMongoUri(rawUri), {
        serverSelectionTimeoutMS: 10000,
        ...(process.env.MONGODB_DB_NAME
            ? { dbName: process.env.MONGODB_DB_NAME }
            : {})
    });

    const appDatabaseName = mongoose.connection.name;
    const menuCollectionName = Menu.collection.collectionName;

    // List all databases on the cluster
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases({
        nameOnly: true,
        authorizedDatabases: false
    });

    const databaseReports = [];

    for (const { name: databaseName } of databases) {
        const db = mongoose.connection.getClient().db(databaseName);
        const collections = await db.listCollections({}, { nameOnly: true }).toArray();
        const collectionReports = [];

        for (const { name: colName } of collections) {
            const count = await db.collection(colName).countDocuments({});
            collectionReports.push({ collection: colName, documentCount: count });
        }

        databaseReports.push({ database: databaseName, collections: collectionReports });
    }

    // Diagnostics on the connected app database for Menu collection
    const activeDb = mongoose.connection.db;
    const menuCol = activeDb.collection(menuCollectionName);
    const totalMenuCount = await menuCol.countDocuments({});

    // Group by category
    const categoryAgg = await menuCol.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray();

    const categoryCounts = {};
    categoryAgg.forEach(item => {
        categoryCounts[item._id === null || item._id === undefined ? "missing" : String(item._id)] = item.count;
    });

    // Group by available field
    const availableAgg = await menuCol.aggregate([
        { $group: { _id: { $ifNull: ["$available", "missing"] }, count: { $sum: 1 } } }
    ]).toArray();

    const availableCounts = {};
    availableAgg.forEach(item => {
        availableCounts[String(item._id)] = item.count;
    });

    // Also check reviews, feedbacks, and admins collections in the connected database
    const otherAppCollections = {};
    for (const name of ["reviews", "feedbacks", "admins"]) {
        const count = await activeDb.collection(name).countDocuments({});
        otherAppCollections[name] = count;
    }

    const output = {
        connectedDatabase: appDatabaseName,
        clusterDatabases: databaseReports,
        menuCollection: {
            name: menuCollectionName,
            totalDocumentCount: totalMenuCount,
            countsByCategory: categoryCounts,
            countsByAvailability: availableCounts
        },
        otherAppCollections
    };

    console.log(JSON.stringify(output, null, 2));
}

main()
    .catch((err) => {
        console.error(
            "Database diagnosis failed:", err.message
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
