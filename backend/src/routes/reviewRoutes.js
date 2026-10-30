const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Review = require("../models/Review");
const { requireAdmin } = require("../middleware/requireAdmin");
const { getPagination, setPaginationHeaders } = require("../utils/pagination");
const { reviewSchema, adminReviewSchema, reviewStatusSchema, validateBody } = require("../validation/schemas");
const { rateLimit } = require("express-rate-limit");

const reviewSubmissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many review submissions. Please try again later." }
});

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
        status: r.status || "pending",
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
        const pagination = getPagination(req, res);
        if (!pagination) return;
        if (mongoose.connection.readyState === 1) {
            const filter = { status: "approved" };
            const total = await Review.countDocuments(filter);
            const reviews = await Review.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit);
            setPaginationHeaders(res, pagination, total);
            return res.json(reviews.map(formatReview));
        }

        // Fallback to seedData if database is connecting/offline
        const seedFile = path.join(__dirname, "../../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            const revs = (data.reviews || []).filter(r => r.status === "approved");
            setPaginationHeaders(res, pagination, revs.length);
            return res.json(revs.slice(pagination.skip, pagination.skip + pagination.limit).map(formatReview));
        }

        setPaginationHeaders(res, pagination, 0);
        res.json([]);
    } catch (err) {
        console.error("GET REVIEWS ERROR:", err);
        const seedFile = path.join(__dirname, "../../seedData.json");
        if (fs.existsSync(seedFile)) {
            const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));
            const approved = (data.reviews || []).filter(r => r.status === "approved");
            const pagination = getPagination(req, res);
            if (!pagination) return;
            setPaginationHeaders(res, pagination, approved.length);
            return res.json(approved.slice(pagination.skip, pagination.skip + pagination.limit).map(formatReview));
        }
        res.status(500).json({
            message: "Failed to get reviews",
            error: err.message
        });
    }
});

router.get("/admin", requireAdmin, async (req, res) => {
    try {
        const pagination = getPagination(req, res);
        if (!pagination) return;
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "Review administration is temporarily unavailable" });
        }
        const total = await Review.countDocuments();
        const reviews = await Review.find().sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit);
        setPaginationHeaders(res, pagination, total);
        return res.json(reviews.map(formatReview));
    } catch (err) {
        console.error("GET ADMIN REVIEWS ERROR:", err);
        return res.status(500).json({ message: "Failed to get reviews" });
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

        const review = await Review.findOne({ _id: id, status: "approved" });
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
router.post("/", reviewSubmissionLimiter, async (req, res) => {
    try {
        const input = validateBody(reviewSchema, req, res);
        if (!input) return;
        const { name, rating, message } = input;

        const newReview = new Review({
            name: name.trim(),
            rating: Number(rating),
            message: message.trim(),
            status: "pending"
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
router.patch("/:id/status", requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const input = validateBody(reviewStatusSchema, req, res);
        if (!input) return;
        const { status } = input;

        const updated = await Review.findByIdAndUpdate(
            id,
            { status },
            { returnDocument: "after", runValidators: true }
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
router.put("/:id/status", requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const input = validateBody(reviewStatusSchema, req, res);
        if (!input) return;
        const { status } = input;

        const updated = await Review.findByIdAndUpdate(
            id,
            { status },
            { returnDocument: "after", runValidators: true }
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
router.put("/:id", requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid review ID format" });
        }

        const input = validateBody(adminReviewSchema, req, res);
        if (!input) return;
        const { name, rating, message, status } = input;

        const update = { name, rating, message };
        if (status !== undefined) update.status = status;
        const updated = await Review.findByIdAndUpdate(
            id,
            update,
            { returnDocument: "after", runValidators: true }
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
router.delete("/:id", requireAdmin, async (req, res) => {
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