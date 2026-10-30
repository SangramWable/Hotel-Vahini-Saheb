const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const sharp = require("sharp");
const Menu = require("../src/models/Menu");

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

function normalizeMongoUri(raw) {
    if (!raw) return raw;
    const match = raw.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^@]+)$/);
    if (!match) return raw;

    const [, prefix, username, password, host] = match;
    return `${prefix}${username}:${encodeURIComponent(decodeURIComponent(password))}@${host}`;
}

function slugify(name) {
    const cleaned = String(name || "dish")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "dish";
}

async function main() {
    const isConfirmed = process.argv.includes("--confirm");

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

        const base64Dishes = [];
        const alreadyPathDishes = [];
        let totalPayloadBytes = 0;

        for (const dish of dishes) {
            const img = typeof dish.image === "string" ? dish.image.trim() : "";
            if (img.startsWith("data:image/")) {
                const match = img.match(/^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
                if (match) {
                    const buffer = Buffer.from(match[1], "base64");
                    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
                    totalPayloadBytes += Buffer.byteLength(img, "utf8");
                    base64Dishes.push({
                        dish,
                        buffer,
                        hash
                    });
                } else {
                    alreadyPathDishes.push(dish);
                }
            } else {
                alreadyPathDishes.push(dish);
            }
        }

        // Dedupe by SHA-256 hash
        const hashMap = new Map();
        const usedSlugs = new Set();

        for (const item of base64Dishes) {
            if (!hashMap.has(item.hash)) {
                let baseSlug = slugify(item.dish.name);
                let candidateSlug = baseSlug;
                let counter = 2;
                while (usedSlugs.has(candidateSlug)) {
                    candidateSlug = `${baseSlug}-${counter}`;
                    counter += 1;
                }
                usedSlugs.add(candidateSlug);

                const fileName = `${candidateSlug}.webp`;
                const webPath = `/assets/images/menu/${fileName}`;
                const diskPath = path.resolve(__dirname, "../../frontend/assets/images/menu", fileName);

                hashMap.set(item.hash, {
                    hash: item.hash,
                    slug: candidateSlug,
                    fileName,
                    webPath,
                    diskPath,
                    buffer: item.buffer,
                    dishes: [item.dish]
                });
            } else {
                hashMap.get(item.hash).dishes.push(item.dish);
            }
        }

        const distinctGroups = Array.from(hashMap.values());
        const sharedGroups = distinctGroups.filter(g => g.dishes.length > 1);

        console.log("==================================================");
        console.log(`Database: ${dbName}`);
        console.log(`Total dishes in collection: ${dishes.length}`);
        console.log(`Dishes with base64 images: ${base64Dishes.length}`);
        console.log(`Dishes already using path/URL: ${alreadyPathDishes.length}`);
        console.log(`Distinct images count (unique hashes): ${distinctGroups.length}`);
        console.log(`Total base64 payload size in database: ${(totalPayloadBytes / (1024 * 1024)).toFixed(2)} MB (${totalPayloadBytes.toLocaleString()} bytes)`);
        console.log(`Image groups shared by multiple dishes: ${sharedGroups.length}`);
        console.log("==================================================");

        if (sharedGroups.length > 0) {
            console.log("\nDishes sharing the same image file:");
            sharedGroups.forEach(group => {
                const names = group.dishes.map(d => d.name || "Unnamed").join(", ");
                console.log(` - ${group.fileName} (${group.dishes.length} dishes): ${names}`);
            });
        }

        if (!isConfirmed) {
            console.log("\n[DRY RUN COMPLETE]");
            console.log("No files were written to disk.");
            console.log("No database records were updated.");
            console.log("\nTo perform the migration and write WebP files to frontend/assets/images/menu, run:");
            console.log("npm run migrate-images -- --confirm\n");
            return;
        }

        // ==================================================
        // CONFIRMED MODE: WRITE FILES & UPDATE DATABASE
        // ==================================================
        console.log("\n=== EXECUTING MIGRATION (--confirm active) ===");
        const menuImgDir = path.resolve(__dirname, "../../frontend/assets/images/menu");
        fs.mkdirSync(menuImgDir, { recursive: true });

        console.log(`Writing ${distinctGroups.length} WebP images to: ${menuImgDir}...`);
        for (const group of distinctGroups) {
            await sharp(group.buffer)
                .resize({ width: 800, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(group.diskPath);
        }
        console.log("All distinct WebP images written successfully.");

        console.log(`Updating ${base64Dishes.length} menu documents with new image paths...`);
        for (const item of base64Dishes) {
            const group = hashMap.get(item.hash);
            await Menu.updateOne(
                { _id: item.dish._id },
                { $set: { image: group.webPath } }
            );
        }

        // Verification counts after update
        const dishesAfter = await Menu.find({}).lean();
        const base64After = dishesAfter.filter(d => typeof d.image === "string" && d.image.trim().startsWith("data:image/")).length;
        const pathsAfter = dishesAfter.filter(d => typeof d.image === "string" && d.image.startsWith("/assets/images/menu/")).length;

        console.log("==================================================");
        console.log("MIGRATION COMPLETED SUCCESSFULLY");
        console.log(`Connected Database: ${dbName}`);
        console.log(`Before migration: base64 = ${base64Dishes.length}, paths = ${alreadyPathDishes.length}`);
        console.log(`After migration:  base64 = ${base64After}, paths = ${pathsAfter}`);
        console.log("==================================================");
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
});
