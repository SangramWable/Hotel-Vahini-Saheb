const express = require("express");
const router = express.Router();

// =====================================
// FOOD RECOMMENDATION
// =====================================

router.post("/", (req, res) => {

    const {
        foodType,
        spice,
        budget
    } = req.body;

    let recommendation = "Maharashtrian Thali";

    // Non-veg recommendation
    if (foodType === "nonveg") {

        if (budget === "high") {
            recommendation = "Mutton Rassa";
        } else {
            recommendation = "Chicken Masala";
        }

    }

    // Veg recommendation
    else {

        if (budget === "low") {
            recommendation = "Bhakri & Pithla";
        } else {
            recommendation = "Maharashtrian Thali";
        }
    }

    res.json({
        recommendation: recommendation,
        foodType: foodType,
        spice: spice,
        budget: budget
    });
});

module.exports = router;