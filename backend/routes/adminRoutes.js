const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");

// =====================================
// ADMIN LOGIN
// =====================================
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Please enter username and password"
            });
        }

        const mongoose = require("mongoose");
        if (mongoose.connection.readyState === 1) {
            const admin = await Admin.findOne({
                username: username.trim(),
                password: password
            });

            if (!admin) {
                return res.status(401).json({
                    message: "Invalid username or password"
                });
            }

            return res.json({
                message: "Login successful",
                admin: {
                    id: admin._id.toString(),
                    _id: admin._id,
                    username: admin.username
                }
            });
        }

        // Fallback login when database is connecting/offline
        if (username.trim() === "admin" && password === "REMOVED") {
            return res.json({
                message: "Login successful",
                admin: {
                    id: "master_admin",
                    username: "admin"
                }
            });
        }

        return res.status(401).json({
            message: "Invalid username or password"
        });
    } catch (err) {
        console.error("ADMIN LOGIN ERROR:", err);
        if (req.body.username === "admin" && req.body.password === "REMOVED") {
            return res.json({
                message: "Login successful",
                admin: {
                    id: "master_admin",
                    username: "admin"
                }
            });
        }
        res.status(500).json({
            message: "Database error",
            error: err.message
        });
    }
});

module.exports = router;