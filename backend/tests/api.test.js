process.env.JWT_SECRET = "t".repeat(48);
process.env.CORS_ORIGINS = "http://localhost:5500";

const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { afterEach, describe, expect, test } = require("@jest/globals");
const jestApi = require("@jest/globals").jest;
const app = require("../src/app");
const Admin = require("../src/models/Admin");
const Menu = require("../src/models/Menu");
const Review = require("../src/models/Review");

jestApi.setTimeout(30000);

const adminId = new mongoose.Types.ObjectId();
let originalReadyState;

describe("restructured frontend serving", () => {
    test("serves the page, assets, and health endpoint from their new paths", async () => {
        const health = await request(app).get("/api/health");
        const root = await request(app).get("/");
        const page = await request(app).get("/pages/index.html");
        const stylesheet = await request(app).get("/assets/css/style.css");

        expect(health.status).toBe(200);
        expect(root.status).toBe(302);
        expect(root.headers.location).toBe("/pages/index.html");
        expect(page.status).toBe(200);
        expect(page.headers["content-type"]).toContain("text/html");
        expect(stylesheet.status).toBe(200);
        expect(stylesheet.headers["content-type"]).toContain("text/css");
    });

    describe("health endpoint", () => {
        test("reports only whether the database connection is connected", async () => {
            originalReadyState = mongoose.connection.readyState;

            mongoose.connection.readyState = 1;
            const connected = await request(app).get("/api/health");
            expect(connected.status).toBe(200);
            expect(connected.body).toEqual({ database: "connected" });

            mongoose.connection.readyState = 0;
            const disconnected = await request(app).get("/api/health");
            expect(disconnected.status).toBe(200);
            expect(disconnected.body).toEqual({ database: "disconnected" });
        });
    });
});

function adminSessionCookie() {
    const token = jwt.sign(
        { username: "test-admin" },
        process.env.JWT_SECRET,
        { subject: adminId.toString(), expiresIn: "8h" }
    );
    return `admin_token=${token}`;
}

function queryResult(value) {
    return {
        sort: jestApi.fn().mockReturnThis(),
        skip: jestApi.fn().mockReturnThis(),
        limit: jestApi.fn().mockResolvedValue(value)
    };
}

afterEach(() => {
    jestApi.restoreAllMocks();
    if (originalReadyState !== undefined) {
        mongoose.connection.readyState = originalReadyState;
        originalReadyState = undefined;
    }
});

describe("admin authentication", () => {
    test("rejects unauthenticated admin operations", async () => {
        const [menu, reviews, feedback] = await Promise.all([
            request(app).post("/api/menu").send({}),
            request(app).get("/api/reviews/admin"),
            request(app).get("/api/feedback")
        ]);

        expect(menu.status).toBe(401);
        expect(reviews.status).toBe(401);
        expect(feedback.status).toBe(401);
    });

    test("logs in with a hashed password and verifies the httpOnly session cookie", async () => {
        originalReadyState = mongoose.connection.readyState;
        mongoose.connection.readyState = 1;
        const password = "test-password-long-enough";
        const passwordHash = await bcrypt.hash(password, 4);
        jestApi.spyOn(Admin, "findOne").mockResolvedValue({
            _id: adminId,
            username: "test-admin",
            password: passwordHash
        });

        const response = await request(app)
            .post("/api/admin/login")
            .send({ username: "test-admin", password });

        expect(response.status).toBe(200);
        expect(response.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
        expect(response.headers["set-cookie"][0]).toMatch(/SameSite=Strict/i);
        expect(response.headers["set-cookie"][0]).toMatch(/Max-Age=28800/i);
        if (process.env.NODE_ENV === "production") {
            expect(response.headers["set-cookie"][0]).toMatch(/Secure/i);
        } else {
            expect(response.headers["set-cookie"][0]).not.toMatch(/Secure/i);
        }

        const session = await request(app)
            .get("/api/admin/session")
            .set("Cookie", response.headers["set-cookie"][0].split(";")[0]);
        expect(session.status).toBe(200);
        expect(session.body.admin.username).toBe("test-admin");
    });

    test("logs out and clears the session cookie", async () => {
        const unauth = await request(app).post("/api/admin/logout");
        expect(unauth.status).toBe(401);

        const response = await request(app)
            .post("/api/admin/logout")
            .set("Cookie", adminSessionCookie());

        expect(response.status).toBe(200);
        expect(response.headers["set-cookie"][0]).toMatch(/^admin_token=;/);
        expect(response.headers["set-cookie"][0]).toMatch(/Expires=Thu, 01 Jan 1970/i);
        expect(response.headers["set-cookie"][0]).toMatch(/SameSite=Strict/i);
        expect(response.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
    });

    test("rejects invalid credentials and rate-limits repeated bad logins", async () => {
        originalReadyState = mongoose.connection.readyState;
        mongoose.connection.readyState = 1;
        jestApi.spyOn(Admin, "findOne").mockResolvedValue(null);

        const responses = [];
        for (let attempt = 0; attempt < 10; attempt++) {
            responses.push(await request(app)
                .post("/api/admin/login")
                .send({ username: "nonexistent-admin", password: "invalid-password" }));
        }

        expect(responses[0].status).toBe(401);
        expect(responses.some(response => response.status === 429)).toBe(true);
    });
});

describe("review validation and moderation", () => {
    test("ignores a public request to approve a review", async () => {
        const save = jestApi.spyOn(Review.prototype, "save").mockResolvedValue();
        const htmlPayload = "<script>alert(1)</script>";
        const response = await request(app)
            .post("/api/reviews")
            .send({ name: "Guest", rating: 5, message: htmlPayload, status: "approved" });

        expect(response.status).toBe(201);
        expect(response.body.review.status).toBe("pending");
        expect(save.mock.instances[0].status).toBe("pending");
        expect(save.mock.instances[0].message).toBe(htmlPayload);
    });

    test("rejects invalid review status and out-of-range rating", async () => {
        const statusResponse = await request(app)
            .post("/api/reviews")
            .send({ name: "Guest", rating: 6, message: "Great food" });
        expect(statusResponse.status).toBe(400);

        const updateResponse = await request(app)
            .patch("/api/reviews/507f1f77bcf86cd799439011/status")
            .set("Cookie", adminSessionCookie())
            .send({ status: "published" });
        expect(updateResponse.status).toBe(400);
    });

    test("public review reads include approved reviews only", async () => {
        originalReadyState = mongoose.connection.readyState;
        mongoose.connection.readyState = 1;
        const approvedReview = {
            _id: new mongoose.Types.ObjectId(),
            name: "Approved guest",
            rating: 5,
            message: "Welcome",
            status: "approved"
        };
        const query = queryResult([approvedReview]);
        const count = jestApi.spyOn(Review, "countDocuments").mockResolvedValue(1);
        const find = jestApi.spyOn(Review, "find").mockReturnValue(query);

        const response = await request(app).get("/api/reviews");

        expect(response.status).toBe(200);
        expect(count).toHaveBeenCalledWith({ status: "approved" });
        expect(find).toHaveBeenCalledWith({ status: "approved" });
        expect(response.body).toHaveLength(1);
        expect(response.body[0].status).toBe("approved");
    });
});

describe("input validation and pagination", () => {
    test("menu list does not filter out items missing availability or status fields", async () => {
        originalReadyState = mongoose.connection.readyState;
        mongoose.connection.readyState = 1;
        const itemWithoutOptionalFilterFields = {
            _id: new mongoose.Types.ObjectId(),
            name: "Legacy dish",
            category: "veg",
            price: 100
        };
        const count = jestApi.spyOn(Menu, "countDocuments").mockResolvedValue(1);
        const find = jestApi.spyOn(Menu, "find").mockReturnValue(
            queryResult([itemWithoutOptionalFilterFields])
        );

        const response = await request(app).get("/api/menu");

        expect(response.status).toBe(200);
        expect(count).toHaveBeenCalledWith();
        expect(find).toHaveBeenCalledWith();
        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe("Legacy dish");
    });

    test("rejects invalid feedback and menu payloads", async () => {
        const feedback = await request(app)
            .post("/api/feedback")
            .send({ name: "Guest", email: "not-an-email", message: "Hello" });
        expect(feedback.status).toBe(400);

        const menu = await request(app)
            .post("/api/menu")
            .set("Cookie", adminSessionCookie())
            .send({ name: "Dish", category: "javascript", price: 10 });
        expect(menu.status).toBe(400);

        const unsafeImage = await request(app)
            .post("/api/menu")
            .set("Cookie", adminSessionCookie())
            .send({ name: "Dish", category: "veg", price: 10, image: "javascript:alert(1)" });
        expect(unsafeImage.status).toBe(400);
    });

    test("caps page size and provides pagination metadata", async () => {
        originalReadyState = mongoose.connection.readyState;
        mongoose.connection.readyState = 1;
        const items = Array.from({ length: 100 }, (_, index) => ({
            _id: new mongoose.Types.ObjectId(),
            name: `Dish ${index}`,
            category: "veg",
            price: index + 1
        }));
        jestApi.spyOn(Menu, "countDocuments").mockResolvedValue(101);
        const query = queryResult(items);
        jestApi.spyOn(Menu, "find").mockReturnValue(query);

        const response = await request(app).get("/api/menu?limit=500");

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(100);
        expect(response.headers["x-limit"]).toBe("100");
        expect(response.headers["x-total-count"]).toBe("101");
        expect(query.limit).toHaveBeenCalledWith(100);
    });

    test("menu route applies category and tolerant available filters", async () => {
        originalReadyState = mongoose.connection.readyState;
        mongoose.connection.readyState = 1;
        const item = {
            _id: new mongoose.Types.ObjectId(),
            name: "Veg Thali",
            category: "veg",
            price: 150
        };
        const count = jestApi.spyOn(Menu, "countDocuments").mockResolvedValue(1);
        const find = jestApi.spyOn(Menu, "find").mockReturnValue(queryResult([item]));

        const response = await request(app).get("/api/menu?category=veg&available=true");

        expect(response.status).toBe(200);
        expect(count).toHaveBeenCalledWith({
            category: "veg",
            $or: [{ available: true }, { available: { $exists: false } }, { available: null }]
        });
        expect(find).toHaveBeenCalledWith({
            category: "veg",
            $or: [{ available: true }, { available: { $exists: false } }, { available: null }]
        });
        expect(response.body).toHaveLength(1);
    });
});
