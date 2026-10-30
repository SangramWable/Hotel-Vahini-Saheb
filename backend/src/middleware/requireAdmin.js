const jwt = require("jsonwebtoken");

const COOKIE_NAME = "admin_token";

function requireAdmin(req, res, next) {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (!token || !process.env.JWT_SECRET) {
        return res.status(401).json({ message: "Admin authentication required" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = {
            id: payload.sub,
            username: payload.username
        };
        return next();
    } catch {
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/"
        });
        return res.status(401).json({ message: "Admin session is invalid or expired" });
    }
}

module.exports = { COOKIE_NAME, requireAdmin };
