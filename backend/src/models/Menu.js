const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        category: {
            type: String,
            required: true,
            trim: true,
            enum: ["veg", "nonveg", "breads", "drinks", "dessert", "special"]
        },
        price: {
            type: Number,
            required: true,
            min: 0.01,
            max: 1000000
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },
        image: {
            type: String,
            default: "",
            maxlength: 81920
        },
        badge: {
            type: String,
            default: "",
            trim: true,
            maxlength: 40
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                return ret;
            }
        }
    }
);

module.exports = mongoose.model("Menu", menuSchema);
