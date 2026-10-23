const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Menu = require("../models/Menu");

// Fallback emoji by category
function getDefaultEmoji(category) {
    const cat = (category || "").toLowerCase();
    if (cat.includes("nonveg") || cat.includes("non-veg")) return "🍗";
    if (cat.includes("bread") || cat.includes("roti")) return "🫓";
    if (cat.includes("drink") || cat.includes("beverage")) return "🥛";
    if (cat.includes("dessert") || cat.includes("sweet")) return "🍨";
    return "🍛";
}

// Helper to format menu document
function formatMenuItem(doc) {
    if (!doc) return null;
    const item = doc.toObject ? doc.toObject() : doc;
    const idStr = item._id ? item._id.toString() : (item.id ? item.id.toString() : "");
    return {
        id: idStr,
        _id: item._id || idStr,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description || "",
        image: item.image || "",
        badge: item.badge || "",
        created_at: item.createdAt || item.created_at || new Date()
    };
}

const path = require("path");
const fs = require("fs");

// ======================================================
// GET ALL MENU ITEMS
// ======================================================
router.get("/", async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const items = await Menu.find().sort({ createdAt: -1 });
            return res.json(items.map(formatMenuItem));
        }

        // Fallback to seedData if database is connecting/offline
        const seedFile = path.join(__dirname, "../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            return res.json((data.menu || []).map(formatMenuItem));
        }

        res.json([]);
    } catch (err) {
        console.error("GET MENU ERROR:", err);
        const seedFile = path.join(__dirname, "../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            return res.json((data.menu || []).map(formatMenuItem));
        }
        res.status(500).json({
            message: "Failed to get menu items",
            error: err.message
        });
    }
});

// ======================================================
// GET SINGLE MENU ITEM BY ID
// ======================================================
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid dish ID format" });
        }

        const item = await Menu.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        res.json(formatMenuItem(item));
    } catch (err) {
        console.error("GET SINGLE MENU ERROR:", err);
        res.status(500).json({
            message: "Failed to get menu item",
            error: err.message
        });
    }
});

// ======================================================
// ADD NEW MENU ITEM
// ======================================================
router.post("/", async (req, res) => {
    try {
        const {
            name,
            category,
            price,
            description,
            image,
            badge
        } = req.body;

        if (!name || !category || price === undefined || price === null || price === "") {
            return res.status(400).json({
                message: "Dish name, category, and price are required."
            });
        }

        const finalImage = (image && String(image).trim()) 
            ? String(image).trim() 
            : getDefaultEmoji(category);

        const newItem = new Menu({
            name: name.trim(),
            category: category.trim(),
            price: Number(price),
            description: description ? description.trim() : "",
            image: finalImage,
            badge: badge ? badge.trim() : ""
        });

        await newItem.save();

        res.status(201).json({
            message: "Menu item added successfully!",
            menuId: newItem._id.toString(),
            id: newItem._id.toString(),
            dish: formatMenuItem(newItem)
        });
    } catch (err) {
        console.error("MENU INSERT ERROR:", err);
        res.status(500).json({
            message: "Failed to add menu item",
            error: err.message
        });
    }
});

// ======================================================
// UPDATE MENU ITEM
// ======================================================
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === "undefined" || id === "null") {
            return res.status(400).json({ message: "Invalid dish ID" });
        }

        const {
            name,
            category,
            price,
            description,
            image,
            badge
        } = req.body;

        if (!name || !category || price === undefined || price === null || price === "") {
            return res.status(400).json({
                message: "Dish name, category, and price are required."
            });
        }

        const updateData = {
            name: name.trim(),
            category: category.trim(),
            price: Number(price),
            description: description ? description.trim() : "",
            badge: badge ? badge.trim() : ""
        };

        if (image !== undefined && image !== null && String(image).trim() !== "") {
            updateData.image = String(image).trim();
        }

        let updated = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            updated = await Menu.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
        }
        if (!updated) {
            updated = await Menu.findOneAndUpdate(
                { $or: [{ _id: id }, { name: id }] },
                updateData,
                { returnDocument: 'after' }
            );
        }

        if (!updated) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        res.json({
            message: "Menu item updated successfully!",
            dish: formatMenuItem(updated)
        });
    } catch (err) {
        console.error("MENU UPDATE ERROR:", err);
        res.status(500).json({
            message: "Failed to update menu item: " + err.message,
            error: err.message
        });
    }
});

// ======================================================
// DELETE MENU ITEM
// ======================================================
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || id === "undefined" || id === "null") {
            return res.status(400).json({ message: "Invalid dish ID" });
        }

        let deleted = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            deleted = await Menu.findByIdAndDelete(id);
        }
        if (!deleted) {
            deleted = await Menu.findOneAndDelete({ $or: [{ _id: id }, { name: id }] });
        }

        if (!deleted) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        res.json({
            message: "Menu item deleted successfully!"
        });
    } catch (err) {
        console.error("MENU DELETE ERROR:", err);
        res.status(500).json({
            message: "Failed to delete menu item: " + err.message,
            error: err.message
        });
    }
});

module.exports = router;