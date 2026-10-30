const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        rating: {
            type: Number,
            required: true,
            default: 5,
            min: 1,
            max: 5
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        },
        status: {
            type: String,
            enum: ["pending", "approved", "cancelled"],
            default: "pending"
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
