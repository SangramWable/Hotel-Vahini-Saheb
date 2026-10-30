const { z } = require("zod");

const reviewSchema = z.object({
    name: z.string().trim().min(1).max(100),
    rating: z.coerce.number().int().min(1).max(5),
    message: z.string().trim().min(1).max(2000)
});

const adminReviewSchema = reviewSchema.extend({
    status: z.enum(["pending", "approved", "cancelled"]).optional()
});

const reviewStatusSchema = z.object({
    status: z.enum(["pending", "approved", "cancelled"])
});

const feedbackSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    message: z.string().trim().min(1).max(2000)
});

function validateBody(schema, req, res) {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            message: "Request validation failed.",
            errors: result.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
        return null;
    }
    return result.data;
}

module.exports = {
    reviewSchema,
    adminReviewSchema,
    reviewStatusSchema,
    feedbackSchema,
    validateBody
};
