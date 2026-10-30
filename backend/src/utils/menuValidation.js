const ALLOWED_CATEGORIES = new Set([
    "veg",
    "nonveg",
    "breads",
    "drinks",
    "dessert",
    "special"
]);
const MAX_IMAGE_DATA_URL_BYTES = 80 * 1024;

function isAllowedMenuImage(image) {
    if (image === undefined || image === null || image === "") return true;
    if (typeof image !== "string") return false;

    if (image.startsWith("data:image/")) {
        return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
            && Buffer.byteLength(image, "utf8") <= MAX_IMAGE_DATA_URL_BYTES;
    }

    if (/^https?:\/\//i.test(image)) {
        try {
            const parsed = new URL(image);
            return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
        } catch {
            return false;
        }
    }

    return /^(?:\/|\.\/)?[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(image)
        && !image.includes("\\")
        && !image.split("/").includes("..");
}

function validateMenuPayload(payload) {
    const errors = [];
    const { name, category, price, description = "", image, badge = "" } = payload;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        errors.push("Name is required and must be at most 100 characters.");
    }
    if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category.trim().toLowerCase())) {
        errors.push("Category must be one of: veg, nonveg, breads, drinks, dessert, special.");
    }
    if (price === "" || price === null || price === undefined || !Number.isFinite(Number(price)) || Number(price) <= 0 || Number(price) > 1000000) {
        errors.push("Price must be a positive number no greater than 1000000.");
    }
    if (typeof description !== "string" || description.length > 500) {
        errors.push("Description must be at most 500 characters.");
    }
    if (typeof badge !== "string" || badge.length > 40) {
        errors.push("Badge must be at most 40 characters.");
    }
    if (!isAllowedMenuImage(image)) {
        errors.push("Image must be an HTTP(S) URL, a safe relative path, or a supported image data URL under 80 KB.");
    }

    return errors;
}

module.exports = { validateMenuPayload };
