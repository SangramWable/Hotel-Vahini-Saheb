require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Database (MongoDB Atlas)
require("./db");

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ===============================
// HOME / TEST API
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "Hotel Vahinisaheb Backend is running!"
    });
});

// ===============================
// ROUTES
// ===============================

const menuRoutes = require("./routes/menuRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const recommendationRoutes =
    require("./routes/recommendationRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/menu", menuRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/feedback", feedbackRoutes);

app.use("/api/recommendation", recommendationRoutes);

app.use("/api/admin", adminRoutes);

// ===============================
// START SERVER
// ===============================

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});