const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;

function getPagination(req, res) {
    const rawPage = req.query.page === undefined ? "1" : req.query.page;
    const rawLimit = req.query.limit === undefined ? String(DEFAULT_PAGE_SIZE) : req.query.limit;
    const page = Number(rawPage);
    const requestedLimit = Number(rawLimit);

    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
        res.status(400).json({ message: "page and limit must be positive integers." });
        return null;
    }

    const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
    if (!Number.isSafeInteger((page - 1) * limit)) {
        res.status(400).json({ message: "page is too large." });
        return null;
    }

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };
}

function setPaginationHeaders(res, { page, limit }, total) {
    res.set({
        "X-Total-Count": String(total),
        "X-Page": String(page),
        "X-Limit": String(limit),
        "X-Total-Pages": String(Math.ceil(total / limit))
    });
}

module.exports = { getPagination, setPaginationHeaders };
