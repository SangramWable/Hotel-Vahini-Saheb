const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        password: {
            type: String,
            required: true
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

adminSchema.pre("save", async function hashPassword() {
    if (!this.isModified("password") || /^\$2[aby]\$/.test(this.password)) return;
    this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("Admin", adminSchema);
