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

function isPlaceholderOrEmpty(desc) {
    if (!desc) return true;
    const trimmed = String(desc).trim().toLowerCase();
    return !trimmed || trimmed === "no description provided." || trimmed === "no description provided";
}

async function main() {
    const isConfirm = process.argv.includes("--confirm");

    const dataFile = path.resolve(__dirname, "../data/dish-descriptions.json");
    if (!fs.existsSync(dataFile)) {
        throw new Error(`Descriptions file not found: ${dataFile}`);
    }

    const descriptions = JSON.parse(fs.readFileSync(dataFile, "utf8"));

    const rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
        throw new Error("MONGODB_URI is not set in environment or backend/.env.");
    }

    const uri = normalizeMongoUri(rawUri);
    const dbName = process.env.MONGODB_DB_NAME || "hotel_vahinisaheb";

    console.log("=================================================");
    console.log(`Connecting to MongoDB database: '${dbName}'...`);
    console.log(`Mode: ${isConfirm ? "CONFIRM (Applying DB writes)" : "DRY RUN (Read-only preview)"}`);
    console.log("=================================================\n");

    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {})
    });

    try {
        console.log(`Connected successfully. Active DB: '${mongoose.connection.name}'\n`);

        const allDishes = await Menu.find({}, { name: 1, description: 1, category: 1 }).lean();

        let beforeEmptyCount = 0;
        let beforeRealCount = 0;
        allDishes.forEach(d => {
            if (isPlaceholderOrEmpty(d.description)) {
                beforeEmptyCount++;
            } else {
                beforeRealCount++;
            }
        });

        console.log("--- BEFORE STATS ---");
        console.log(`Total dishes in database: ${allDishes.length}`);
        console.log(`Dishes with existing custom description: ${beforeRealCount}`);
        console.log(`Dishes with empty or placeholder description: ${beforeEmptyCount}\n`);

        const plannedUpdates = [];
        const skippedRealDescriptions = [];
        const missingDescriptions = [];

        for (const dish of allDishes) {
            const dishName = dish.name;
            const newDesc = descriptions[dishName];

            if (!newDesc) {
                missingDescriptions.push({ id: dish._id.toString(), name: dishName });
                continue;
            }

            if (!isPlaceholderOrEmpty(dish.description)) {
                skippedRealDescriptions.push({
                    name: dishName,
                    existing: dish.description
                });
                continue;
            }

            plannedUpdates.push({
                id: dish._id,
                name: dishName,
                newDescription: newDesc
            });
        }

        console.log("--- PROPOSED DESCRIPTIONS ---");
        plannedUpdates.forEach((item, index) => {
            console.log(`[${index + 1}/${plannedUpdates.length}] ${item.name}:`);
            console.log(`    -> "${item.newDescription}"`);
        });

        if (skippedRealDescriptions.length > 0) {
            console.log(`\n--- PRESERVED EXISTING DESCRIPTIONS (${skippedRealDescriptions.length}) ---`);
            skippedRealDescriptions.forEach(item => {
                console.log(`- ${item.name}: "${item.existing}"`);
            });
        }

        if (missingDescriptions.length > 0) {
            console.warn(`\n⚠️ DISHES MISSING FROM DESCRIPTIONS FILE (${missingDescriptions.length}):`);
            missingDescriptions.forEach(item => {
                console.warn(`- ${item.name} (id: ${item.id})`);
            });
        }

        if (!isConfirm) {
            console.log("\n=================================================");
            console.log("DRY RUN COMPLETE. No database writes were performed.");
            console.log(`Would update: ${plannedUpdates.length} dishes.`);
            console.log(`Would preserve: ${skippedRealDescriptions.length} dishes with existing descriptions.`);
            console.log("To apply these descriptions, run: npm run apply-descriptions -- --confirm");
            console.log("=================================================");
            return;
        }

        console.log("\n=================================================");
        console.log(`WRITING UPDATES to '${mongoose.connection.name}'...`);
        console.log("=================================================");

        let updatedCount = 0;
        for (const update of plannedUpdates) {
            const result = await Menu.updateOne(
                { _id: update.id },
                { $set: { description: update.newDescription } }
            );
            if (result.modifiedCount > 0) {
                updatedCount++;
            }
        }

        const afterDishes = await Menu.find({}, { name: 1, description: 1 }).lean();
        let afterEmptyCount = 0;
        let afterRealCount = 0;
        afterDishes.forEach(d => {
            if (isPlaceholderOrEmpty(d.description)) {
                afterEmptyCount++;
            } else {
                afterRealCount++;
            }
        });

        console.log("\n--- AFTER STATS ---");
        console.log(`Total dishes in database: ${afterDishes.length}`);
        console.log(`Dishes updated in this run: ${updatedCount}`);
        console.log(`Dishes with custom description now: ${afterRealCount}`);
        console.log(`Dishes still empty or placeholder: ${afterEmptyCount}`);
        console.log("=================================================");
        console.log("Update completed successfully!");
        console.log("=================================================");
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(err => {
    console.error("Script failed:", err.message);
    process.exitCode = 1;
});
