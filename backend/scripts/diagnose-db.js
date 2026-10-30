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
        throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(normalizeMongoUri(rawUri), {
        serverSelectionTimeoutMS: 10000,
        ...(process.env.MONGODB_DB_NAME
            ? { dbName: process.env.MONGODB_DB_NAME }
            : {})
    });

    const appDatabaseName = mongoose.connection.name;
    const menuCollectionName = Menu.collection.collectionName;
    const { databases } = await mongoose.connection.db.admin().listDatabases({
        nameOnly: true,
        authorizedDatabases: false
    });

    const databaseReports = [];
    const menuLikeCollectionsInOtherDatabases = [];
    const menuLikeNames = new Set(["menuitems", "menus", "dishes"]);
    let appMenuCount = 0;

    for (const { name: databaseName } of databases) {
        const database = mongoose.connection.getClient().db(databaseName);
        const collections = await database.listCollections({}, { nameOnly: true }).toArray();
        const collectionReports = [];

        for (const { name: collectionName } of collections) {
            const count = await database.collection(collectionName).countDocuments({});
            collectionReports.push({ name: collectionName, documentCount: count });

            if (
                databaseName === appDatabaseName &&
                collectionName === menuCollectionName
            ) {
                appMenuCount = count;
            }

            if (
                databaseName !== appDatabaseName &&
                menuLikeNames.has(collectionName.toLowerCase())
            ) {
                menuLikeCollectionsInOtherDatabases.push({
                    database: databaseName,
                    collection: collectionName,
                    documentCount: count
                });
            }
        }

        databaseReports.push({ name: databaseName, collections: collectionReports });
    }

    console.log(JSON.stringify({
        appDatabaseName,
        databases: databaseReports,
        appMenuCollection: {
            name: menuCollectionName,
            totalDocumentCount: appMenuCount,
            routeFilterFields: [],
            routeFilterCounts: {}
        },
        menuLikeCollectionsInOtherDatabases
    }, null, 2));
}

main()
    .catch(() => {
        console.error(
            "Database diagnosis failed. Confirm the read-only MongoDB account can list databases, collections, and document counts."
        );
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
