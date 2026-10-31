require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../src/models/Admin");

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

async function provisionAdmin() {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
        throw new Error("MONGODB_URI and JWT_SECRET must be set in the environment.");
    }

    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password || password.length < 12) {
        throw new Error("A username and a password of at least 12 characters are required.");
    }

    const rawUri = process.env.MONGODB_URI;
    const uri = normalizeMongoUri(rawUri);
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {})
    });
    console.log(`Connected to database '${mongoose.connection.name}'.`);

    const existing = await Admin.findOne({ username });
    if (existing && !process.argv.includes("--rotate-existing")) {
        throw new Error(`Admin account '${username}' already exists; provisioning is one-time.`);
    }

    if (existing) {
        existing.password = password;
        await existing.save();
        console.log(`Rotated credentials for admin account '${username}'.`);
    } else {
        await Admin.create({ username, password });
        console.log(`Provisioned admin account '${username}'.`);
    }
}

provisionAdmin()
    .catch((error) => {
        console.error("Admin provisioning failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
