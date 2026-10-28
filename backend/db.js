require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Admin = require("./models/Admin");
const Menu = require("./models/Menu");
const Review = require("./models/Review");
const Feedback = require("./models/Feedback");

// Helper: auto-encode password if it has unencoded special characters like '@'
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

const rawUri = process.env.MONGODB_URI || "REMOVED";
const uri = normalizeMongoUri(rawUri);

// Validate password placeholder
if (uri.includes("<db_password>")) {
    console.warn("\n==================================================================");
    console.warn("⚠️  MONGODB CONFIGURATION NOTICE:");
    console.warn("    Your connection string in backend/.env contains '<db_password>'.");
    console.warn("    Please open 'backend/.env' and replace '<db_password>' with your");
    console.warn("    actual MongoDB Atlas database user password.");
    console.warn("==================================================================\n");
}

mongoose
    .connect(uri, {
        serverSelectionTimeoutMS: 5000
    })
    .then(async () => {
        console.log("MongoDB Atlas connected successfully to Hotel Vahinisaheb cluster!");

        // Auto-seed initial data if collections are empty
        try {
            await autoSeedInitialData();
        } catch (seedErr) {
            console.error("Auto-seed error:", seedErr.message);
        }
    })
    .catch((err) => {
        console.error("\n❌ MongoDB Connection Error:");
        console.error(err.message);
        if (err.message.includes("bad auth") || err.message.includes("Authentication failed")) {
            console.error("👉 Reason: Incorrect MongoDB username or password in backend/.env.");
        } else if (err.message.includes("Could not connect to any servers") || err.message.includes("ETIMEDOUT") || err.message.includes("alert internal error")) {
            console.error("👉 Reason: Network access blocked by MongoDB Atlas.");
            console.error("👉 Fix: Go to MongoDB Atlas -> Network Access -> Add IP Address -> click 'ALLOW ACCESS FROM ANYWHERE' (0.0.0.0/0) -> Confirm.");
            console.error("        (Note: Dynamic IPs change frequently; 0.0.0.0/0 prevents future connection drops).");
        }
        console.error("------------------------------------------------------------------\n");
    });

// Auto-seed helper
async function autoSeedInitialData() {
    const seedFile = path.join(__dirname, "seedData.json");
    if (!fs.existsSync(seedFile)) return;

    const raw = fs.readFileSync(seedFile, "utf8");
    const data = JSON.parse(raw);

    // 1. Admin
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0 && data.admin && data.admin.length > 0) {
        for (const a of data.admin) {
            await Admin.create({ username: a.username, password: a.password });
        }
        console.log(`[Seed] Inserted ${data.admin.length} admin user(s) into MongoDB.`);
    }

    // 2. Menu
    const menuCount = await Menu.countDocuments();
    if (menuCount === 0 && data.menu && data.menu.length > 0) {
        const menuDocs = data.menu.map(m => ({
            name: m.name,
            category: m.category,
            price: m.price,
            description: m.description || "",
            image: m.image || "",
            badge: m.badge || ""
        }));
        await Menu.insertMany(menuDocs);
        console.log(`[Seed] Inserted ${menuDocs.length} menu items into MongoDB.`);
    }

    // 3. Reviews
    const revCount = await Review.countDocuments();
    if (revCount === 0 && data.reviews && data.reviews.length > 0) {
        const revDocs = data.reviews.map(r => ({
            name: r.name,
            rating: Number(r.rating) || 5,
            message: r.message,
            status: r.status || "approved"
        }));
        await Review.insertMany(revDocs);
        console.log(`[Seed] Inserted ${revDocs.length} reviews into MongoDB.`);
    }

    // 4. Feedback
    const fbCount = await Feedback.countDocuments();
    if (fbCount === 0 && data.feedback && data.feedback.length > 0) {
        const fbDocs = data.feedback.map(f => ({
            name: f.name,
            email: f.email,
            message: f.message
        }));
        await Feedback.insertMany(fbDocs);
        console.log(`[Seed] Inserted ${fbDocs.length} feedback inquiries into MongoDB.`);
    }
}

module.exports = mongoose;