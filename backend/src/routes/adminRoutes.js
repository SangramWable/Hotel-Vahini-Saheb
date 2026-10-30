const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { COOKIE_NAME, requireAdmin } = require("../middleware/requireAdmin");
const { rateLimit } = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again later." }
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000
};
const clearCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
};

router.post("/login", loginLimiter, async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({ message: "Invalid login request" });
        }
        const { username, password } = req.body;

        if (typeof username !== "string" || username.trim().length > 100
            || typeof password !== "string" || !username.trim() || !password || password.length > 200) {
            return res.status(400).json({
                message: "Please enter username and password"
            });
        }

        const mongoose = require("mongoose");
        if (typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.length < 32) {
            console.error("JWT_SECRET must be configured with at least 32 characters");
            return res.status(500).json({ message: "Authentication is not configured" });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "Admin authentication is temporarily unavailable" });
        }

        const admin = await Admin.findOne({ username: username.trim() });
        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const token = jwt.sign(
            { username: admin.username },
            process.env.JWT_SECRET,
            { subject: admin._id.toString(), expiresIn: "8h" }
        );
        res.cookie(COOKIE_NAME, token, cookieOptions);
        return res.json({
            message: "Login successful",
            admin: {
                id: admin._id.toString(),
                username: admin.username
            }
        });
    } catch (err) {
        console.error("ADMIN LOGIN ERROR:", err);
        return res.status(500).json({
            message: "Database error",
        });
    }
});

router.get("/session", requireAdmin, (req, res) => {
    res.json({ admin: req.admin });
});

router.post("/logout", requireAdmin, (req, res) => {
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    res.json({ message: "Logged out" });
});

module.exports = router;