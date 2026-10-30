const path = require("path");
const fs = require("fs");
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

    try {
        const dbName = mongoose.connection.name;
        const dishes = await Menu.find({}).lean();

        // Default path outside the repository root
        const defaultBackupPath = path.resolve(__dirname, "../../../menu-backup.json");
        const targetPath = process.env.BACKUP_PATH
            ? path.resolve(process.env.BACKUP_PATH)
            : defaultBackupPath;

        // Ensure parent directory exists
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        fs.writeFileSync(targetPath, JSON.stringify(dishes, null, 2), "utf8");

        console.log(`Database: ${dbName}`);
        console.log(`Exported dishes count: ${dishes.length}`);
        console.log(`Backup file written to: ${targetPath}`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error("Failed to export menu backup:", err.message);
    process.exitCode = 1;
});
