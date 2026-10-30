const ALLOWED_CATEGORIES = new Set([
    "veg",
    "nonveg",
    "breads",
    "drinks",
    "dessert",
    "special"
]);

function isAllowedMenuImage(image) {
    if (image === undefined || image === null || image === "") return true;
    if (typeof image !== "string") return false;

    const trimmed = image.trim();
    if (!trimmed) return true;

    // Explicitly reject data URIs on write so base64 never returns to the database
    if (trimmed.toLowerCase().startsWith("data:")) {
        return false;
    }

    // Accept HTTPS URLs
    if (/^https:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            return parsed.protocol === "https:" && Boolean(parsed.hostname);
        } catch {
            return false;
        }
    }

    // Accept /assets/images/menu/<slug>.(webp|jpg|jpeg|png) paths
    if (trimmed.startsWith("/assets/images/menu/")) {
        const file = trimmed.slice("/assets/images/menu/".length);
        return /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:webp|jpeg|jpg|png)$/i.test(file)
            && !file.includes("..")
            && !file.includes("\\");
    }

    // Also accept assets/images/menu/<slug> without leading slash
    if (trimmed.startsWith("assets/images/menu/")) {
        const file = trimmed.slice("assets/images/menu/".length);
        return /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:webp|jpeg|jpg|png)$/i.test(file)
            && !file.includes("..")
            && !file.includes("\\");
    }

    // Accept fallback emoji or short indicator
    // eslint-disable-next-line no-control-regex
    if (trimmed.length <= 8 && !/[\u0000-\u0020\\]/.test(trimmed)) {
        return true;
    }

    return false;
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
        errors.push("Image must be an HTTPS URL or a path in /assets/images/menu/ (data URIs are not allowed).");
    }

    return errors;
}

module.exports = { validateMenuPayload, isAllowedMenuImage };
