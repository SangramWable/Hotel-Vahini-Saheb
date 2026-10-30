require("dotenv").config();

if (typeof process.env.JWT_SECRET !== "string" || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a secret of at least 32 characters before starting the server.");
}

require("./src/config/db");

const app = require("./src/app");
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
