require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");
const path = require("path");
const fs = require("fs");
const Menu = require("../src/models/Menu");
const Review = require("../src/models/Review");
const Feedback = require("../src/models/Feedback");

function normalizeMongoUri(raw) {
    if (!raw) return raw;
    const match = raw.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^@]+)$/);
    if (match) {
        const safePassword = encodeURIComponent(decodeURIComponent(match[3]));
        return `${match[1]}${match[2]}:${safePassword}@${match[4]}`;
    }
    return raw;
}

async function seed() {
    if (!process.argv.includes("--force")) {
        throw new Error("Refusing to seed without the explicit --force flag.");
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to seed when NODE_ENV=production.");
    }

    const uri = normalizeMongoUri(process.env.MONGODB_URI);
    if (!uri || uri.includes("<db_password>")) {
        throw new Error("Please configure a valid MONGODB_URI before seeding.");
    }

    console.log("Connecting to the configured MongoDB database...");
    await mongoose.connect(uri);
    const databaseName = mongoose.connection.name;
    console.log(`Target MongoDB database: ${databaseName}`);

    const rl = readline.createInterface({ input: stdin, output: stdout });
    let confirmation;
    try {
        confirmation = await rl.question(`This will DELETE menu, review, and feedback records. Type "${databaseName}" to continue: `);
    } finally {
        rl.close();
    }
    if (confirmation !== databaseName) {
        throw new Error("Database name did not match; no records were deleted.");
    }

    const seedFile = path.join(__dirname, "../seedData.json");
    if (!fs.existsSync(seedFile)) {
        throw new Error("seedData.json not found.");
    }

    const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
    await Menu.deleteMany({});
    await Review.deleteMany({});
    await Feedback.deleteMany({});
    console.log("Cleared menu, review, and feedback collections. Admin accounts were not modified.");

    if (data.menu && data.menu.length > 0) {
        await Menu.insertMany(data.menu.map(m => ({
            name: m.name,
            category: m.category,
            price: m.price,
            description: m.description || "",
            image: m.image || "",
            badge: m.badge || ""
        })));
        console.log(`✓ Seeded ${data.menu.length} menu items.`);
    }

    if (data.reviews && data.reviews.length > 0) {
        await Review.insertMany(data.reviews.map(r => ({
            name: r.name,
            rating: Number(r.rating) || 5,
            message: r.message,
            status: r.status || "approved"
        })));
        console.log(`✓ Seeded ${data.reviews.length} reviews.`);
    }

    if (data.feedback && data.feedback.length > 0) {
        await Feedback.insertMany(data.feedback.map(f => ({
            name: f.name,
            email: f.email,
            message: f.message
        })));
        console.log(`✓ Seeded ${data.feedback.length} feedback messages.`);
    }

    console.log("\nSeeding completed successfully.");
}

seed()
    .catch((err) => {
        console.error("Seeding refused or failed:", err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
