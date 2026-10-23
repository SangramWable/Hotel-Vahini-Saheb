require("dotenv").config();
const mongoose = require("mongoose");
const Menu = require("./models/Menu");
const Review = require("./models/Review");
const Feedback = require("./models/Feedback");
const Admin = require("./models/Admin");

// Helper: auto-encode password if needed
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

const uri = normalizeMongoUri(process.env.MONGODB_URI);

async function runDatabaseDiagnostics() {
    console.log("==========================================================");
    console.log("  HOTEL VAHINISAHEB - MONGODB ATLAS LIVE DIAGNOSTIC TEST");
    console.log("==========================================================\n");

    try {
        console.log("1. Connecting to MongoDB Atlas cluster...");
        const start = Date.now();
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
        const latency = Date.now() - start;
        console.log(`   ✓ Connected successfully in ${latency}ms!\n`);

        console.log("2. Inspecting Database Collections:");
        const menuCount = await Menu.countDocuments();
        console.log(`   ✓ 'menus' collection:      ${menuCount} dishes found`);

        const reviewCount = await Review.countDocuments();
        console.log(`   ✓ 'reviews' collection:    ${reviewCount} reviews found`);

        const feedbackCount = await Feedback.countDocuments();
        console.log(`   ✓ 'feedbacks' collection:  ${feedbackCount} inquiries found`);

        const adminCount = await Admin.countDocuments();
        console.log(`   ✓ 'admins' collection:     ${adminCount} admin accounts found\n`);

        console.log("3. Testing Live Cloud Write & Delete (CRUD Test)...");
        const testDish = await Menu.create({
            name: "Diagnostic Test Dish",
            category: "veg",
            price: 99.00,
            description: "Temporary test document to verify cloud write permissions.",
            badge: "TEST"
        });
        console.log(`   ✓ Successfully inserted test document into cloud (ID: ${testDish._id})`);

        await Menu.findByIdAndDelete(testDish._id);
        console.log(`   ✓ Successfully deleted test document from cloud.\n`);

        console.log("==========================================================");
        console.log("🎉 ALL TESTS PASSED! Your MongoDB Atlas database is 100% HEALTHY.");
        console.log("==========================================================");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("\n❌ Database Diagnostic Test Failed:");
        console.error(err.message);
        process.exit(1);
    }
}

runDatabaseDiagnostics();
