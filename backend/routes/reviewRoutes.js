const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Review = require("../models/Review");

// Helper to format review document
function formatReview(doc) {
    if (!doc) return null;
    const r = doc.toObject ? doc.toObject() : doc;
    return {
        id: (r._id || "").toString(),
        _id: r._id,
        name: r.name,
        rating: Number(r.rating) || 5,
        message: r.message,
        status: r.status || "approved",
        created_at: r.createdAt || new Date()
    };
}

const path = require("path");
const fs = require("fs");

// =====================================
// GET ALL REVIEWS
// =====================================
router.get("/", async (req, res) => {
    try {
        const isAdmin = req.query.admin === "true";

        if (mongoose.connection.readyState === 1) {
            let filter = {};
            if (!isAdmin) {
                // Public website: show only approved reviews or reviews without status
                filter = {
                    $or: [
                        { status: "approved" },
                        { status: { $exists: false } },
                        { status: null }
                    ]
                };
            }
            const reviews = await Review.find(filter).sort({ createdAt: -1 });
            return res.json(reviews.map(formatReview));
        }

        // Fallback to seedData if database is connecting/offline
        const seedFile = path.join(__dirname, "../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            let revs = data.reviews || [];
            if (!isAdmin) {
                revs = revs.filter(r => (r.status || "approved") === "approved");
            }
            return res.json(revs.map(formatReview));
        }

        res.json([]);
    } catch (err) {
        console.error("GET REVIEWS ERROR:", err);
        const seedFile = path.join(__dirname, "../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            return res.json((data.reviews || []).map(formatReview));
        }
        res.status(500).json({
            message: "Failed to get reviews",
            error: err.message
        });
    }
});

// =====================================
// GET SINGLE REVIEW BY ID
// =====================================
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.json(formatReview(review));
    } catch (err) {
        console.error("GET SINGLE REVIEW ERROR:", err);
        res.status(500).json({ message: "Failed to get review" });
    }
});

// =====================================
// ADD NEW REVIEW (Public or Admin)
// =====================================
router.post("/", async (req, res) => {
    try {
        const { name, rating, message, status } = req.body;

        if (!name || !rating || !message) {
            return res.status(400).json({
                message: "Please fill all fields (name, rating, and message)"
            });
        }

        const newReview = new Review({
            name: name.trim(),
            rating: Number(rating),
            message: message.trim(),
            status: status || "approved"
        });

        await newReview.save();

        res.status(201).json({
            message: "Review submitted successfully!",
            reviewId: newReview._id.toString(),
            id: newReview._id.toString(),
            review: formatReview(newReview)
        });
    } catch (err) {
        console.error("ADD REVIEW ERROR:", err);
        res.status(500).json({
            message: "Failed to submit review",
            error: err.message
        });
    }
});

// =====================================
// UPDATE REVIEW STATUS (Approve / Cancel)
// =====================================
router.patch("/:id/status", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required (e.g. 'approved' or 'cancelled')" });
        }

        const updated = await Review.findByIdAndUpdate(
            id,
            { status: status.toLowerCase() },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.json({
            message: `Review status changed to ${status}!`,
            review: formatReview(updated)
        });
    } catch (err) {
        console.error("UPDATE REVIEW STATUS ERROR:", err);
        res.status(500).json({ message: "Failed to update review status" });
    }
});

// Support PUT /:id/status as well (used by dashboard)
router.put("/:id/status", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const updated = await Review.findByIdAndUpdate(
            id,
            { status: status.toLowerCase() },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.json({
            message: `Review status changed to ${status}!`,
            review: formatReview(updated)
        });
    } catch (err) {
        console.error("UPDATE REVIEW STATUS ERROR:", err);
        res.status(500).json({ message: "Failed to update review status" });
    }
});

// =====================================
// UPDATE FULL REVIEW
// =====================================
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const { name, rating, message, status } = req.body;
        if (!name || !rating || !message) {
            return res.status(400).json({ message: "Name, rating and message are required" });
        }

        const updated = await Review.findByIdAndUpdate(
            id,
            {
                name: name.trim(),
                rating: Number(rating),
                message: message.trim(),
                status: status || "approved"
            },
            { returnDocument: 'after' }
        );

        if (!updated) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.json({
            message: "Review updated successfully!",
            review: formatReview(updated)
        });
    } catch (err) {
        console.error("UPDATE REVIEW ERROR:", err);
        res.status(500).json({ message: "Failed to update review" });
    }
});

// =====================================
// DELETE / CANCEL REVIEW PERMANENTLY
// =====================================
router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const deleted = await Review.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Review not found" });
        }

        res.json({ message: "Review deleted successfully!" });
    } catch (err) {
        console.error("DELETE REVIEW ERROR:", err);
        res.status(500).json({
            message: "Failed to delete review",
            error: err.message
        });
    }
});

module.exports = router;