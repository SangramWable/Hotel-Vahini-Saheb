const js = require("@eslint/js");
const globals = require("globals");
const html = require("eslint-plugin-html");

module.exports = [
    {
        ignores: ["node_modules/**", "../backend/node_modules/**"]
    },
    {
        ...js.configs.recommended,
        files: ["src/**/*.js", "scripts/**/*.js", "server.js", "tests/**/*.js"],
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: globals.node
        }
    },
    {
        files: [
            "frontend/**/*.js",
            "frontend/**/*.html",
            "../frontend/**/*.js",
            "../frontend/**/*.html"
        ],
        plugins: {
            html
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: {
                ...globals.browser,
                ...globals.node,
                apiFetch: "readonly",
                fetchApi: "readonly",
                adminRequest: "readonly",
                requireAdminSession: "readonly",
                logoutAdmin: "readonly",
                API_BASE_URL: "readonly",
                isSafeImageSrc: "readonly",
                isSafeHref: "readonly",
                isSafeHttpOrRelativeUrl: "readonly",
                loadMenuFromDatabase: "readonly",
                renderMenuItems: "readonly",
                searchMenu: "readonly",
                filterMenu: "readonly",
                toggleMenu: "readonly",
                renderPaginationControls: "readonly",
                changePaginationPage: "readonly",
                submitFeedback: "readonly",
                loadReviews: "readonly",
                initReviews: "readonly",
                submitReview: "readonly",
                updateReviewsAnalytics: "readonly",
                applyReviewFilters: "readonly",
                voteHelpful: "readonly",
                toggleReviewComposer: "readonly",
                renderReviewCards: "readonly",
                getDinerInitials: "readonly",
                extractDishAndMessage: "readonly",
                DEFAULT_REVIEWS_FALLBACK: "readonly",
                DEFAULT_MENU_FALLBACK: "readonly",
                currentMenuPage: "writable",
                menuTotalPages: "writable",
                databaseMenuItems: "writable",
                allReviewsData: "writable",
                currentReviewsPage: "writable",
                reviewsTotalPages: "writable",
                activeCategory: "writable"
            }
        },
        rules: {
            "no-undef": "error"
        }
    }
];
