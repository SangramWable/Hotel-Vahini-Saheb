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
    const isConfirmed = process.argv.includes("--confirm");

    if (!isConfirmed) {
        console.log("==================================================================");
        console.log("⚠️  SAFETY NOTICE: import-menu.js requires the --confirm flag.");
        console.log("    Usage: node scripts/import-menu.js --confirm");
        console.log("    This script non-destructively upserts dishes by name from seedData.json.");
        console.log("    It never deletes and never touches admins, reviews, or feedback.");
        console.log("==================================================================");
        process.exit(0);
    }

    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
        throw new Error("MONGODB_URI is not set.");
    }

    const seedFile = path.resolve(__dirname, "../seedData.json");
    if (!fs.existsSync(seedFile)) {
        throw new Error("seedData.json not found at " + seedFile);
    }

    const rawSeed = fs.readFileSync(seedFile, "utf8");
    const seedData = JSON.parse(rawSeed);
    const seedMenuItems = seedData.menu || [];

    await mongoose.connect(normalizeMongoUri(rawUri), {
        serverSelectionTimeoutMS: 10000,
        ...(process.env.MONGODB_DB_NAME
            ? { dbName: process.env.MONGODB_DB_NAME }
            : {})
    });

    const targetDbName = mongoose.connection.name;
    const countBefore = await Menu.countDocuments();

    console.log(`[Import] Target Database: ${targetDbName}`);
    console.log(`[Import] Menu count before: ${countBefore}`);
    console.log(`[Import] Seed items to process: ${seedMenuItems.length}`);

    let inserted = 0;
    let updated = 0;

    for (const item of seedMenuItems) {
        if (!item.name) continue;

        const updateDoc = {
            name: item.name.trim(),
            category: (item.category || "veg").trim(),
            price: Number(item.price) || 0,
            description: (item.description || "").trim(),
            image: (item.image || "").trim(),
            badge: (item.badge || "").trim()
        };

        const res = await Menu.updateOne(
            { name: item.name.trim() },
            { $set: updateDoc },
            { upsert: true }
        );

        if (res.upsertedCount > 0) inserted++;
        else if (res.modifiedCount > 0) updated++;
    }

    const countAfter = await Menu.countDocuments();
    console.log(`[Import] Completed: ${inserted} inserted, ${updated} updated.`);
    console.log(`[Import] Menu count after: ${countAfter}`);
}

main()
    .catch((err) => {
        console.error("Import failed:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
