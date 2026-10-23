const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        rating: {
            type: Number,
            required: true,
            default: 5
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ["approved", "cancelled"],
            default: "approved"
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                ret.created_at = ret.createdAt;
                return ret;
            }
        }
    }
);

module.exports = mongoose.model("Review", reviewSchema);
