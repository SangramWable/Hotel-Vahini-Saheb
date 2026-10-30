require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../src/models/Admin");

async function provisionAdmin() {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
        throw new Error("MONGODB_URI and JWT_SECRET must be set in the environment.");
    }

    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password || password.length < 12) {
        throw new Error("A username and a password of at least 12 characters are required.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
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
