function adminApiUrls(endpoint) {
    return [`${(window.API_BASE_URL || "").replace(/\/$/, "")}${endpoint}`];
}

async function adminRequest(endpoint, options = {}) {
    const response = await window.apiFetch(endpoint, options);
    if (response.status === 401 || response.status === 403) {
        window.location.href = "admin-login.html";
    }
    return response;
}

async function requireAdminSession() {
    try {
        const response = await adminRequest("/api/admin/session");
        if (!response.ok) return;
        const { admin } = await response.json();
        const badge = document.getElementById("adminBadgeName");
        if (badge && admin && admin.username) {
            badge.textContent = `👑 Master Administrator (${admin.username})`;
        }
    } catch (error) {
        console.error("Could not verify admin session:", error);
    }
}

async function logoutAdmin() {
    try {
        await adminRequest("/api/admin/logout", { method: "POST" });
    } catch (error) {
        console.error("Could not end admin session:", error);
    } finally {
        window.location.href = "admin-login.html";
    }
}
