window.apiFetch = function apiFetch(endpoint, options = {}) {
    const baseUrl = (window.API_BASE_URL || "").replace(/\/$/, "");
    return fetch(`${baseUrl}${endpoint}`, {
        ...options,
        credentials: options.credentials || "include"
    });
};
