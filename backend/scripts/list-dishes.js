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
        const dishes = await Menu.find({}, { name: 1, _id: 0 }).lean();
        const names = dishes
            .map(d => (d.name || "").trim())
            .filter(Boolean);

        names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

        const repoRoot = path.resolve(__dirname, "../..");
        const targetFile = path.join(repoRoot, "dish-names.txt");

        fs.writeFileSync(targetFile, names.join("\n") + "\n", "utf8");

        console.log(names.length);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error("Failed to list dishes:", err.message);
    process.exitCode = 1;
});
