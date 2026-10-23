const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");

// Helper to format feedback document
function formatFeedback(doc) {
    if (!doc) return null;
    const f = doc.toObject ? doc.toObject() : doc;
    return {
        id: (f._id || "").toString(),
        _id: f._id,
        name: f.name,
        email: f.email,
        message: f.message,
        created_at: f.createdAt || new Date()
    };
}

const path = require("path");
const fs = require("fs");

// =====================================
// GET ALL FEEDBACK
// =====================================
router.get("/", async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const feedbackList = await Feedback.find().sort({ createdAt: -1 });
            return res.json(feedbackList.map(formatFeedback));
        }

        // Fallback to seedData if database is connecting/offline
        const seedFile = path.join(__dirname, "../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            return res.json((data.feedback || []).map(formatFeedback));
        }

        res.json([]);
    } catch (err) {
        console.error("GET FEEDBACK ERROR:", err);
        const seedFile = path.join(__dirname, "../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            return res.json((data.feedback || []).map(formatFeedback));
        }
        res.status(500).json({
            message: "Failed to get feedback",
            error: err.message
        });
    }
});

// =====================================
// GET SINGLE FEEDBACK BY ID
// =====================================
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid feedback ID format" });
        }

        const item = await Feedback.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Feedback not found" });
        }

        res.json(formatFeedback(item));
    } catch (err) {
        console.error("GET SINGLE FEEDBACK ERROR:", err);
        res.status(500).json({ message: "Failed to get feedback item" });
    }
});

// =====================================
// SUBMIT FEEDBACK (Public)
// =====================================
router.post("/", async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                message: "Please fill all fields (name, email, and message)"
            });
        }

        const newFeedback = new Feedback({
            name: name.trim(),
            email: email.trim(),
            message: message.trim()
        });

        await newFeedback.save();

        res.status(201).json({
            message: "Thank you for your feedback! We have received your message.",
            feedbackId: newFeedback._id.toString(),
            id: newFeedback._id.toString(),
            feedback: formatFeedback(newFeedback)
        });
    } catch (err) {
        console.error("ADD FEEDBACK ERROR:", err);
        res.status(500).json({
            message: "Failed to submit feedback",
            error: err.message
        });
    }
});

// =====================================
// DELETE FEEDBACK (Admin)
// =====================================
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid feedback ID format" });
        }

        const deleted = await Feedback.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Feedback item not found" });
        }

        res.json({ message: "Feedback deleted successfully!" });
    } catch (err) {
        console.error("DELETE FEEDBACK ERROR:", err);
        res.status(500).json({
            message: "Failed to delete feedback",
            error: err.message
        });
    }
});

module.exports = router;