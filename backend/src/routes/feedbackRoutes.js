const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");
const { requireAdmin } = require("../middleware/requireAdmin");
const { getPagination, setPaginationHeaders } = require("../utils/pagination");
const { feedbackSchema, validateBody } = require("../validation/schemas");
const { rateLimit } = require("express-rate-limit");

const feedbackSubmissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many feedback submissions. Please try again later." }
});

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
router.get("/", requireAdmin, async (req, res) => {
    try {
        const pagination = getPagination(req, res);
        if (!pagination) return;
        if (mongoose.connection.readyState === 1) {
            const total = await Feedback.countDocuments();
            const feedbackList = await Feedback.find().sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit);
            setPaginationHeaders(res, pagination, total);
            return res.json(feedbackList.map(formatFeedback));
        }

        // Fallback to seedData if database is connecting/offline
        const seedFile = path.join(__dirname, "../../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            const feedback = data.feedback || [];
            setPaginationHeaders(res, pagination, feedback.length);
            return res.json(feedback.slice(pagination.skip, pagination.skip + pagination.limit).map(formatFeedback));
        }

        setPaginationHeaders(res, pagination, 0);
        res.json([]);
    } catch (err) {
        console.error("GET FEEDBACK ERROR:", err);
        const seedFile = path.join(__dirname, "../../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            const pagination = getPagination(req, res);
            if (!pagination) return;
            const feedback = data.feedback || [];
            setPaginationHeaders(res, pagination, feedback.length);
            return res.json(feedback.slice(pagination.skip, pagination.skip + pagination.limit).map(formatFeedback));
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
router.get("/:id", requireAdmin, async (req, res) => {
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
router.post("/", feedbackSubmissionLimiter, async (req, res) => {
    try {
        const input = validateBody(feedbackSchema, req, res);
        if (!input) return;
        const { name, email, message } = input;

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
router.delete("/:id", requireAdmin, async (req, res) => {
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