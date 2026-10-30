require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const path = require("path");

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    credentials: true,
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit", "X-Total-Pages"]
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
const frontendRoot = path.join(__dirname, "../../frontend");
app.use(express.static(frontendRoot));

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/", (req, res) => {
    res.redirect(302, "/pages/index.html");
});

app.use("/api/menu", require("./routes/menuRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/recommendation", require("./routes/recommendationRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

module.exports = app;
