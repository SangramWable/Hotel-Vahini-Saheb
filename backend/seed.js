require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Admin = require("./models/Admin");
const Menu = require("./models/Menu");
const Review = require("./models/Review");
const Feedback = require("./models/Feedback");

function normalizeMongoUri(raw) {
    if (!raw) return raw;
    const match = raw.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^@]+)$/);
    if (match) {
        const prefix = match[1];
        const user = match[2];
        const password = match[3];
        const rest = match[4];
        const safePassword = encodeURIComponent(decodeURIComponent(password));
        return `${prefix}${user}:${safePassword}@${rest}`;
    }
    return raw;
}

const rawUri = process.env.MONGODB_URI;
const uri = normalizeMongoUri(rawUri);

if (!uri || uri.includes("<db_password>")) {
    console.error("❌ Please provide a valid MONGODB_URI in backend/.env with your password.");
    process.exit(1);
}

async function seed() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(uri);
        console.log("Connected successfully!");

        const seedFile = path.join(__dirname, "seedData.json");
        if (!fs.existsSync(seedFile)) {
            console.error("seedData.json not found!");
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));

        // Clear existing
        await Admin.deleteMany({});
        await Menu.deleteMany({});
        await Review.deleteMany({});
        await Feedback.deleteMany({});
        console.log("Cleared existing collections.");

        // Insert Admin
        if (data.admin && data.admin.length > 0) {
            await Admin.insertMany(data.admin.map(a => ({ username: a.username, password: a.password })));
            console.log(`✓ Seeded ${data.admin.length} admin accounts.`);
        }

        // Insert Menu
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

        // Insert Reviews
        if (data.reviews && data.reviews.length > 0) {
            await Review.insertMany(data.reviews.map(r => ({
                name: r.name,
                rating: Number(r.rating) || 5,
                message: r.message,
                status: r.status || "approved"
            })));
            console.log(`✓ Seeded ${data.reviews.length} reviews.`);
        }

        // Insert Feedback
        if (data.feedback && data.feedback.length > 0) {
            await Feedback.insertMany(data.feedback.map(f => ({
                name: f.name,
                email: f.email,
                message: f.message
            })));
            console.log(`✓ Seeded ${data.feedback.length} feedback messages.`);
        }

        console.log("\n🎉 Seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seed();
