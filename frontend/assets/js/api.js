(function (global) {
    function apiFetch(endpoint, options = {}) {
        const baseUrl = (global.API_BASE_URL || "").replace(/\/$/, "");
        return fetch(`${baseUrl}${endpoint}`, {
            ...options,
            credentials: options.credentials || "include"
        });
    }

    const SAFE_DATA_IMAGE_REGEX = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

    function isSafeImageSrc(value) {
        if (typeof value !== "string") return false;
        const trimmed = value.trim();
        if (!trimmed) return false;

        if (trimmed.startsWith("data:")) {
            return SAFE_DATA_IMAGE_REGEX.test(trimmed);
        }

        if (/[\u0000-\u0020\\]/.test(trimmed)) return false;
        if (trimmed.startsWith("//")) return false;
        if (!/^(?:https?:\/\/|\/|\.\/|\.\.\/)/.test(trimmed)) return false;

        try {
            const base = (global.location && global.location.href)
                ? global.location.href
                : "https://hotel-vahini-saheb.example.com/";
            const parsed = new URL(trimmed, base);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
            return false;
        }
    }

    function isSafeHref(value) {
        if (typeof value !== "string") return false;
        const trimmed = value.trim();
        if (!trimmed || /[\u0000-\u0020\\]/.test(trimmed)) return false;
        if (
            trimmed.startsWith("//") ||
            trimmed.toLowerCase().startsWith("data:") ||
            trimmed.toLowerCase().startsWith("javascript:")
        ) {
            return false;
        }

        try {
            const base = (global.location && global.location.href)
                ? global.location.href
                : "https://hotel-vahini-saheb.example.com/";
            const parsed = new URL(trimmed, base);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
            return false;
        }
    }

    const inrCurrencyFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function formatPrice(rawPrice) {
        if (rawPrice === null || rawPrice === undefined || rawPrice === "") {
            return null;
        }
        let num;
        if (typeof rawPrice === "number") {
            num = rawPrice;
        } else {
            const str = String(rawPrice).trim().replace(/,/g, "");
            const cleaned = str.replace(/[^0-9.-]/g, "");
            if (!cleaned) return null;
            num = parseFloat(cleaned);
        }
        if (!Number.isFinite(num) || isNaN(num) || num <= 0) {
            return null;
        }
        return inrCurrencyFormatter.format(num);
    }

    global.apiFetch = apiFetch;
    global.isSafeImageSrc = isSafeImageSrc;
    global.isSafeHref = isSafeHref;
    global.isSafeHttpOrRelativeUrl = isSafeImageSrc;
    global.formatPrice = formatPrice;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            apiFetch,
            isSafeImageSrc,
            isSafeHref,
            isSafeHttpOrRelativeUrl: isSafeImageSrc,
            formatPrice
        };
    }
})(typeof window !== "undefined" ? window : globalThis);
