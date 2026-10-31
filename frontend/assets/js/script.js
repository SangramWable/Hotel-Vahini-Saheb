/* MOBILE MENU */

function toggleMenu(toggleButton) {
    const navLinks = document.getElementById("navLinks");
    const expanded = navLinks.classList.toggle("active");
    const button = toggleButton || document.querySelector(".menu-toggle");
    if (button && button.hasAttribute("aria-expanded")) {
        button.setAttribute("aria-expanded", String(expanded));
    }
}

function validateImageSrc(value) {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) return true;
    if (/[\u0000-\u0020\\]/.test(trimmed) || trimmed.startsWith("//")) return false;
    try {
        const base = (typeof window !== "undefined" && window.location && window.location.href)
            ? window.location.href
            : "https://hotel-vahini-saheb.example.com/";
        const parsed = new URL(trimmed, base);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

const isSafeImageSrc = (typeof window !== "undefined" && typeof window.isSafeImageSrc === "function" && window.isSafeImageSrc !== validateImageSrc)
    ? window.isSafeImageSrc
    : validateImageSrc;

const isSafeHttpOrRelativeUrl = isSafeImageSrc;


/* MENU FILTER + SEARCH */

let activeCategory = "all";


function filterMenu(category, button) {

    activeCategory = category;

    document
        .querySelectorAll(".filter-btn")
        .forEach(btn =>
            btn.classList.remove("active")
        );

    button.classList.add("active");

    searchMenu();

}


function searchMenu() {

    const cards =
        document.querySelectorAll(".food-card");

    const search =
        document
            .getElementById("menuSearch")
            .value
            .toLowerCase()
            .trim();

    const noResults =
        document.getElementById("noResults");

    let visible = 0;


    cards.forEach(card => {

        const categoryMatch =
            activeCategory === "all" ||
            card.dataset.category === activeCategory;

        const textMatch =
            card.innerText
                .toLowerCase()
                .includes(search);

        const show =
            categoryMatch && textMatch;

        card.style.display =
            show ? "block" : "none";

        if (show) {
            visible++;
        }

    });


    noResults.style.display =
        visible === 0 ? "block" : "none";

}


/* BUILD YOUR MEAL */

function calculateMeal() {

    const main =
        Number(
            document.getElementById("mainCourse").value
        );

    const bread =
        Number(
            document.getElementById("bread").value
        );

    const rice =
        Number(
            document.getElementById("rice").value
        );

    const drink =
        Number(
            document.getElementById("drink").value
        );

    const dessert =
        Number(
            document.getElementById("dessert").value
        );


    const total =
        main + bread + rice + drink + dessert;


    document.getElementById("mealTotal")
        .innerText = total;


    document.getElementById("mealSummary")
        .innerText =
        total > 0
        ? "Your selected meal has been added."
        : "Select items to build your meal.";

}


/* AI RECOMMENDATION */

function recommendDish() {

    const foodType =
        document.getElementById("foodType").value;

    const spice =
        document.getElementById("spice").value;

    const budget =
        document.getElementById("budget").value;


    const result =
        document.getElementById("recommendation");


    let dish =
        "Maharashtrian Thali";


    if (foodType === "nonveg") {

        if (budget === "high") {
            dish = "Mutton Rassa";
        } else {
            dish = "Chicken Masala";
        }

    } else {

        if (budget === "low") {
            dish = "Bhakri & Pithla";
        } else {
            dish = "Maharashtrian Thali";
        }

    }


    result.style.display = "block";

    result.replaceChildren(
        document.createTextNode("✨ We recommend "),
        Object.assign(document.createElement("strong"), { textContent: dish }),
        document.createTextNode(" for you!")
    );

}


// ==========================================
// UNIVERSAL API CALLER
// ==========================================
function fetchApi(endpoint, options = {}) {
    return window.apiFetch(endpoint, options);
}

/* FEEDBACK */

async function submitFeedback(event) {
    event.preventDefault();

    const form = event.target;
    const name = form.querySelector('input[type="text"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const message = form.querySelector('textarea').value.trim();

    if (!name || !email || !message) {
        alert("Please fill all fields.");
        return;
    }

    try {
        const response = await fetchApi("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, message })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to submit feedback");
        }

        alert(data.message || "Thank you for contacting Hotel Vahinisaheb!");
        form.reset();
    } catch (error) {
        console.error("Feedback error:", error);
        alert("Failed to submit feedback. Please ensure the backend server is running.");
    }
}

// Default signature menu items shown if database is loading or offline
const DEFAULT_MENU_FALLBACK = [
    { id: 1, name: "Maharashtrian Thali", description: "Complete traditional Maharashtrian meal with authentic flavours.", price: "280.00", category: "veg", image: "🍛", badge: "BEST SELLER" },
    { id: 2, name: "Mutton Rassa", description: "Spicy and authentic Kolhapuri mutton gravy prepared with homemade masala.", price: "320.00", category: "nonveg", image: "🍗", badge: "CHEF'S SPECIAL" },
    { id: 3, name: "Bharli Vangi", description: "Stuffed baby eggplants slow cooked in peanut and coconut gravy.", price: "180.00", category: "veg", image: "🍆", badge: "TRADITIONAL" },
    { id: 4, name: "Bhakri (Jowar / Bajra)", description: "Freshly roasted traditional Maharashtrian flatbread.", price: "50.00", category: "breads", image: "🫓", badge: "HOT & FRESH" },
    { id: 5, name: "Taak (Spiced Buttermilk)", description: "Chilled traditional buttermilk with mustard seeds and coriander.", price: "40.00", category: "drinks", image: "🥛", badge: "REFRESHING" },
    { id: 6, name: "Chicken Masala", description: "Tender chicken cooked with rustic Maharashtrian spices.", price: "260.00", category: "nonveg", image: "🍗", badge: "POPULAR" },
    { id: 7, name: "Panner Tikka", description: "Char-grilled marinated paneer cubes with peppers.", price: "200.00", category: "veg", image: "🧀", badge: "FAVORITE" },
    { id: 8, name: "Solkadhi", description: "Authentic Konkani digestif made with kokum and coconut milk.", price: "60.00", category: "drinks", image: "🍷", badge: "AUTHENTIC" },
    { id: 9, name: "Chapati", description: "Soft, hot whole wheat phulkas.", price: "25.00", category: "breads", image: "🫓", badge: "FRESH" }
];

let databaseMenuItems = [];
let currentMenuPage = 1;
let menuTotalPages = 1;

function renderMenuItems(items, fallbackReason = null) {
    const menuGrid = document.getElementById("menuGrid");
    if (!menuGrid) return;

    menuGrid.replaceChildren();

    if (fallbackReason) {
        const notice = document.createElement("div");
        notice.style.cssText = "grid-column: 1 / -1; background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.85rem; color: #f7e7b4;";
        const noticeText = document.createElement("span");
        noticeText.textContent = `⚡ Showing signature menu preview. ${fallbackReason}`;
        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.textContent = "🔄 Sync Database";
        retryButton.style.cssText = "background:#d4af37;color:#120b06;border:none;padding:6px 14px;border-radius:15px;font-weight:700;cursor:pointer;";
        retryButton.addEventListener("click", loadMenuFromDatabase);
        notice.append(noticeText, retryButton);
        menuGrid.appendChild(notice);
    }

    if (!items || items.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.style.cssText = "text-align:center;grid-column:1/-1;";
        emptyMessage.textContent = "No dishes found in menu.";
        menuGrid.appendChild(emptyMessage);
        return;
    }

    const getCategoryOrder = item => {
        const category = (item.category || "").trim().toLowerCase();
        if (category.includes("nonveg") || category.includes("non-veg") || category.includes("non veg")) return 0;
        if (category.includes("bread") || category.includes("roti")) return 2;
        if (category.includes("drink") || category.includes("beverage")) return 3;
        if (category.includes("veg")) return 1;
        return 4;
    };

    const orderedItems = [...items].sort((first, second) => {
        const categoryDifference = getCategoryOrder(first) - getCategoryOrder(second);
        if (categoryDifference !== 0) return categoryDifference;

        const firstIsThali = /\bthali$/i.test((first.name || "").trim());
        const secondIsThali = /\bthali$/i.test((second.name || "").trim());
        return Number(secondIsThali) - Number(firstIsThali);
    });

    orderedItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "food-card";

        const category = (item.category || "").toLowerCase();
        let filterCategory = category;

        if (category.includes("bread") || category.includes("roti")) {
            filterCategory = "breads";
        } else if (category.includes("drink") || category.includes("beverage")) {
            filterCategory = "drinks";
        } else if (category.includes("nonveg") || category.includes("non-veg") || category.includes("non veg")) {
            filterCategory = "nonveg";
        } else if (category.includes("veg")) {
            filterCategory = "veg";
        }

        card.dataset.category = filterCategory;

        const image = document.createElement("div");
        image.className = "food-img";

        let tagClass = "tag-veg";
        let displayCat = item.category || "General";
        const catLower = (item.category || "").toLowerCase();
        if (catLower === "veg") { tagClass = "tag-veg"; displayCat = "Veg"; }
        else if (catLower.includes("nonveg") || catLower.includes("non-veg") || catLower.includes("non veg")) { tagClass = "tag-nonveg"; displayCat = "Non-Veg"; }
        else if (catLower.includes("bread") || catLower.includes("roti")) { tagClass = "tag-breads"; displayCat = "Breads"; }
        else if (catLower.includes("drink") || catLower.includes("beverage")) { tagClass = "tag-drinks"; displayCat = "Drinks"; }
        else { tagClass = "tag-other"; }

        const categoryTag = document.createElement("span");
        categoryTag.className = `food-category-tag ${tagClass}`;
        categoryTag.textContent = displayCat;
        image.appendChild(categoryTag);

        if (item.badge) {
            const badge = document.createElement("span");
            badge.className = "food-badge-pill";
            badge.textContent = item.badge;
            image.appendChild(badge);
        }

        const imgSrc = item.image;
        if (isSafeHttpOrRelativeUrl(imgSrc)) {
            const img = document.createElement("img");
            img.setAttribute("src", imgSrc);
            img.setAttribute("alt", item.name || "Dish");
            img.setAttribute("loading", "lazy");
            img.addEventListener("error", () => {
                img.style.display = "none";
                if (!image.querySelector(".food-fallback-emoji")) {
                    const fallback = document.createElement("span");
                    fallback.className = "food-fallback-emoji";
                    fallback.textContent = "🍛";
                    image.appendChild(fallback);
                }
            }, { once: true });
            image.appendChild(img);
        } else {
            const emoji = document.createElement("span");
            emoji.className = "food-fallback-emoji";
            emoji.textContent = typeof imgSrc === "string" && !imgSrc.startsWith("data:") && imgSrc.trim().length > 0 ? imgSrc : "🍛";
            image.appendChild(emoji);
        }

        const info = document.createElement("div");
        info.className = "food-info";

        const name = document.createElement("h3");
        name.textContent = item.name || "Unnamed dish";

        const rawDesc = (item.description || "").trim();
        const isPlaceholder = !rawDesc || /^no description provided\.?$/i.test(rawDesc);
        if (!isPlaceholder) {
            const description = document.createElement("p");
            description.textContent = rawDesc;
            info.append(name, description, bottom);
        } else {
            info.append(name, bottom);
        }
        card.append(image, info);
        menuGrid.appendChild(card);
    });

    const searchInput = document.getElementById("menuSearch");
    if (searchInput && !searchInput.value) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const queryParam = urlParams.get("search");
            if (queryParam) {
                searchInput.value = queryParam;
            }
        } catch (_) {}
    }

    if (typeof searchMenu === "function") {
        searchMenu();
    }
}

async function loadMenuFromDatabase(page = 1) {
    const menuGrid = document.getElementById("menuGrid");
    if (!menuGrid) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetchApi(`/api/menu?page=${page}&limit=100`, {
            signal: controller.signal
        });
        if (!response.ok) {
            const error = new Error(`API error (HTTP ${response.status})`);
            error.status = response.status;
            throw error;
        }

        const menuItems = await response.json();
        if (!Array.isArray(menuItems)) {
            throw new Error("API error (invalid menu response)");
        }

        if (menuItems.length === 0) {
            throw new Error("EMPTY_MENU_LIST");
        }

        databaseMenuItems = menuItems;
        currentMenuPage = Number(response.headers.get("X-Page")) || page;
        menuTotalPages = Number(response.headers.get("X-Total-Pages")) || 1;
        renderMenuItems(databaseMenuItems);
        if (typeof renderPaginationControls === "function") {
            renderPaginationControls("menuPagination", currentMenuPage, menuTotalPages, response.headers.get("X-Total-Count"), loadMenuFromDatabase);
        }
        console.log("Menu successfully loaded from MongoDB Atlas:", databaseMenuItems.length, "dishes");
    } catch (error) {
        const fallbackReason = error.message === "EMPTY_MENU_LIST"
            ? "API returned an empty list."
            : error.name === "AbortError"
                ? "API request timed out (15-second limit)."
                : error.status
                    ? error.message
                    : error instanceof TypeError
                        ? "API error (network request failed)."
                        : error.message;
        console.warn("Menu API unavailable; showing fallback preview:", fallbackReason);
        databaseMenuItems = DEFAULT_MENU_FALLBACK;
        currentMenuPage = 1;
        menuTotalPages = 1;
        renderMenuItems(DEFAULT_MENU_FALLBACK, fallbackReason);
        if (typeof renderPaginationControls === "function") {
            renderPaginationControls("menuPagination", 1, 1, databaseMenuItems.length, loadMenuFromDatabase);
        }
    } finally {
        clearTimeout(timeoutId);
    }
}

loadMenuFromDatabase();

// =====================================
// LUXURY REVIEWS & TESTIMONIALS SYSTEM
// =====================================

const DEFAULT_REVIEWS_FALLBACK = [
    { id: 1, name: 'Sangram Wable', rating: 5, message: '[Ordered: Maharashtrian Thali] It was an authentic and royal dining experience! The rassa and fresh hot bhakris reminded me of home.' },
    { id: 2, name: 'Viraj Borge', rating: 4, message: '[Ordered: Mutton Rassa] Great visit! Slow cooked mutton with spicy tambda and pandhra rassa was fantastic.' },
    { id: 3, name: 'Chaitanya Deshmukh', rating: 4, message: '[Ordered: Pithla Bhakri] Traditional chulivarcha taste, warm hospitality, and pure Maharashtrian culture.' },
    { id: 5, name: 'Harsh Patil', rating: 5, message: '[Ordered: Special Feast Thali] Food was delicious & awesome! The Solkadhi and Taak were wonderfully refreshing.' }
];

let allReviewsData = [];
let currentFilterRating = 'all';
let currentSearchQuery = '';
let currentReviewsPage = 1;
let reviewsTotalPages = 1;

// Helper: Extract diner initials for avatar
function getDinerInitials(name) {
    if (!name) return 'V';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

// Helper: Parse dish name from review message if available
function extractDishAndMessage(rawMessage) {
    let dish = 'Maharashtrian Dine-in';
    let message = rawMessage || '';

    const orderMatch = message.match(/^\[Ordered:\s*([^\]]+)\]\s*(.*)$/i);
    if (orderMatch) {
        dish = orderMatch[1].trim();
        message = orderMatch[2].trim();
    } else {
        const lower = message.toLowerCase();
        if (lower.includes('thali')) dish = 'Maharashtrian Thali';
        else if (lower.includes('mutton') || lower.includes('rassa')) dish = 'Mutton Rassa Special';
        else if (lower.includes('chicken')) dish = 'Chicken Masala';
        else if (lower.includes('bhakri') || lower.includes('pithla')) dish = 'Pithla Bhakri';
        else if (lower.includes('solkadhi')) dish = 'Special Solkadhi';
        else if (lower.includes('paneer')) dish = 'Paneer Special';
    }

    return { dish, message };
}

// Compute and render Rating Analytics Hub
function updateReviewsAnalytics(reviews) {
    const hubAvg = document.getElementById('hubAvgScore');
    const hubTotal = document.getElementById('hubTotalReviewsText');
    const countAllSpan = document.getElementById('countAll');

    const total = reviews.length;
    if (countAllSpan) countAllSpan.textContent = total;

    if (total === 0) {
        if (hubAvg) hubAvg.textContent = '5.0';
        if (hubTotal) hubTotal.textContent = 'Be the first to leave a review!';
        return;
    }

    let sum = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach(r => {
        const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
        counts[rating] = (counts[rating] || 0) + 1;
        sum += rating;
    });

    const avg = (sum / total).toFixed(1);
    if (hubAvg) hubAvg.textContent = avg;
    if (hubTotal) hubTotal.textContent = `Based on ${total} verified guest review${total > 1 ? 's' : ''}`;

    // Update progress bars & percentage labels
    for (let star = 1; star <= 5; star++) {
        const count = counts[star] || 0;
        const pct = Math.round((count / total) * 100);
        const barElem = document.getElementById(`bar${star}`);
        const pctElem = document.getElementById(`pct${star}`);

        if (barElem) barElem.style.width = `${pct}%`;
        if (pctElem) pctElem.textContent = `${pct}%`;
    }
}

// Interactive "Helpful" like button handler
function voteHelpful(reviewId, btn) {
    const storageKey = `review_helpful_${reviewId}`;
    const countKey = `review_helpful_cnt_${reviewId}`;

    const numHash = String(reviewId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const defaultLikes = (numHash % 11) + 2;

    let isVoted = localStorage.getItem(storageKey) === 'true';
    let currentCount = parseInt(localStorage.getItem(countKey)) || defaultLikes;

    if (isVoted) {
        // Toggle off
        currentCount = Math.max(0, currentCount - 1);
        localStorage.removeItem(storageKey);
        localStorage.setItem(countKey, currentCount);
        btn.classList.remove('voted');
    } else {
        // Toggle on
        currentCount += 1;
        localStorage.setItem(storageKey, 'true');
        localStorage.setItem(countKey, currentCount);
        btn.classList.add('voted');
    }

    const countElem = btn.querySelector('.helpful-count');
    if (countElem) {
        countElem.textContent = `(${currentCount})`;
    }
}

// Filter reviews by rating
function filterReviews(rating, button) {
    currentFilterRating = rating;

    // Update active filter button
    const buttons = document.querySelectorAll('.review-filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    if (button) button.classList.add('active');

    applyReviewFilters();
}

// Live search in reviews
function searchReviews() {
    const input = document.getElementById('reviewSearchInput');
    currentSearchQuery = input ? input.value.trim().toLowerCase() : '';
    applyReviewFilters();
}

// Filter & search evaluation
function applyReviewFilters() {
    let filtered = allReviewsData.filter(rev => {
        const rating = Number(rev.rating) || 5;

        // Rating match
        if (currentFilterRating !== 'all' && rating !== Number(currentFilterRating)) {
            return false;
        }

        // Search text match
        if (currentSearchQuery) {
            const name = (rev.name || '').toLowerCase();
            const msg = (rev.message || '').toLowerCase();
            if (!name.includes(currentSearchQuery) && !msg.includes(currentSearchQuery)) {
                return false;
            }
        }

        return true;
    });

    renderReviewCards(filtered, false);
}

// Render Review Cards Grid
function renderReviewCards(reviews, fallbackReason = null) {
    const reviewsContainer = document.getElementById("reviewsContainer");
    if (!reviewsContainer) return;

    reviewsContainer.replaceChildren();

    if (fallbackReason) {
        const notice = document.createElement("div");
        notice.style.cssText = "grid-column: 1 / -1; background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; text-align: center; font-size: 0.85rem; color: #f7e7b4; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;";
        const noticeText = document.createElement("span");
        noticeText.textContent = typeof fallbackReason === "string"
            ? `⭐ Showing approved guest reviews preview. ${fallbackReason}`
            : "⭐ Showing approved guest reviews preview.";
        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.textContent = "🔄 Retry Sync";
        retryButton.style.cssText = "background:#d4af37;color:#120b06;border:none;padding:5px 14px;border-radius:12px;font-weight:700;cursor:pointer;";
        retryButton.addEventListener("click", loadReviews);
        notice.append(noticeText, retryButton);
        reviewsContainer.appendChild(notice);
    }

    if (!reviews || reviews.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.style.cssText = "text-align:center;grid-column:1/-1;padding:50px 20px;background:rgba(26,17,11,0.6);border:1px dashed rgba(212,175,55,0.25);border-radius:18px;";
        const icon = document.createElement("p");
        icon.style.cssText = "font-size:2.2rem;margin:0 0 10px;";
        icon.textContent = "👑";
        const heading = document.createElement("h3");
        heading.style.cssText = "font-family:'Cinzel',serif;color:#f7e7b4;margin:0 0 8px;";
        heading.textContent = "No Reviews Found";
        const description = document.createElement("p");
        description.style.cssText = "color:#aaa;font-size:0.9rem;margin:0 0 15px;";
        description.textContent = "Be the first diner to share your royal experience with us!";
        const writeButton = document.createElement("button");
        writeButton.type = "button";
        writeButton.style.cssText = "background:#d4af37;color:#120b06;border:none;padding:9px 20px;border-radius:20px;font-weight:700;cursor:pointer;";
        writeButton.textContent = "✍️ Write a Review";
        writeButton.addEventListener("click", () => {
            if (typeof toggleReviewComposer === "function") toggleReviewComposer();
        });
        emptyState.append(icon, heading, description, writeButton);
        reviewsContainer.appendChild(emptyState);
        return;
    }

    reviews.forEach(review => {
        const card = document.createElement("div");
        card.className = "luxury-review-card";

        const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5)));
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        const initials = getDinerInitials(review.name);
        const { dish, message } = extractDishAndMessage(review.message);

        const revId = review.id || Math.floor(Math.random() * 1000);
        const isVoted = localStorage.getItem(`review_helpful_${revId}`) === 'true';
        const numHash = String(revId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const defaultLikes = (numHash % 11) + 2;
        const currentLikes = parseInt(localStorage.getItem(`review_helpful_cnt_${revId}`)) || defaultLikes;

        const reviewBody = document.createElement("div");
        const header = document.createElement("div");
        header.className = "card-diner-header";
        const avatar = document.createElement("div");
        avatar.className = "diner-avatar";
        avatar.textContent = initials;
        const meta = document.createElement("div");
        meta.className = "diner-meta";
        const nameRow = document.createElement("div");
        nameRow.className = "diner-name-row";
        const name = document.createElement("h4");
        name.className = "diner-name";
        name.textContent = review.name || "";
        const verified = document.createElement("span");
        verified.className = "verified-icon";
        verified.title = "Verified Customer";
        verified.textContent = "✓";
        nameRow.append(name, verified);
        const diningText = document.createElement("div");
        diningText.className = "diner-date-text";
        diningText.textContent = "Verified Dining Experience";
        meta.append(nameRow, diningText);
        header.append(avatar, meta);

        const starsRow = document.createElement("div");
        starsRow.className = "card-stars-row";
        const starsVisual = document.createElement("div");
        starsVisual.className = "card-stars-visual";
        starsVisual.textContent = stars;
        const ratingPill = document.createElement("span");
        ratingPill.className = "rating-num-pill";
        ratingPill.textContent = `${rating}.0 ★`;
        starsRow.append(starsVisual, ratingPill);
        const messageText = document.createElement("p");
        messageText.className = "card-review-body";
        messageText.textContent = `“${message}”`;
        reviewBody.append(header, starsRow, messageText);

        const footer = document.createElement("div");
        footer.className = "card-review-footer";
        const dishTag = document.createElement("span");
        dishTag.className = "dish-order-tag";
        dishTag.textContent = `🍽️ ${dish}`;
        const voteButton = document.createElement("button");
        voteButton.type = "button";
        voteButton.className = `helpful-btn ${isVoted ? "voted" : ""}`;
        voteButton.title = "Was this review helpful?";
        const voteLabel = document.createElement("span");
        voteLabel.textContent = "👍 Helpful";
        const voteCount = document.createElement("span");
        voteCount.className = "helpful-count";
        voteCount.textContent = `(${currentLikes})`;
        voteButton.append(voteLabel, document.createTextNode(" "), voteCount);
        voteButton.addEventListener("click", () => voteHelpful(revId, voteButton));
        footer.append(dishTag, voteButton);
        card.append(reviewBody, footer);

        reviewsContainer.appendChild(card);
    });
}

// Fetch all reviews from backend API
async function loadReviews(page = 1) {
    const reviewsContainer = document.getElementById("reviewsContainer");
    if (!reviewsContainer) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetchApi(`/api/reviews?page=${page}&limit=100`, {
            signal: controller.signal
        });
        if (!response.ok) {
            const error = new Error(`API error (HTTP ${response.status})`);
            error.status = response.status;
            throw error;
        }

        const reviews = await response.json();
        if (!Array.isArray(reviews)) {
            throw new Error("API error (invalid reviews response)");
        }

        if (reviews.length === 0) {
            throw new Error("EMPTY_REVIEWS_LIST");
        }

        currentReviewsPage = Number(response.headers.get("X-Page")) || page;
        reviewsTotalPages = Number(response.headers.get("X-Total-Pages")) || 1;
        if (typeof renderPaginationControls === "function") {
            renderPaginationControls("reviewsPagination", currentReviewsPage, reviewsTotalPages, response.headers.get("X-Total-Count"), loadReviews);
        }
        allReviewsData = reviews;
        updateReviewsAnalytics(allReviewsData);
        applyReviewFilters();
        console.log("Reviews successfully loaded from database:", allReviewsData.length);
    } catch (error) {
        const fallbackReason = error.message === "EMPTY_REVIEWS_LIST"
            ? "API returned an empty list."
            : error.name === "AbortError"
                ? "API request timed out (15-second limit)."
                : error.status
                    ? error.message
                    : error instanceof TypeError
                        ? "API error (network request failed)."
                        : error.message;
        console.warn("Could not reach backend reviews API, using fallback preview:", fallbackReason);
        allReviewsData = DEFAULT_REVIEWS_FALLBACK;
        currentReviewsPage = 1;
        reviewsTotalPages = 1;
        if (typeof renderPaginationControls === "function") {
            renderPaginationControls("reviewsPagination", 1, 1, allReviewsData.length, loadReviews);
        }
        updateReviewsAnalytics(allReviewsData);
        renderReviewCards(DEFAULT_REVIEWS_FALLBACK, fallbackReason);
    } finally {
        clearTimeout(timeoutId);
    }
}

// Standard Submit Review Handler (for simple forms)
async function submitReview(event) {
    event.preventDefault();

    const name = document.getElementById("reviewName")?.value.trim();
    const rating = document.getElementById("reviewRating")?.value;
    const message = document.getElementById("reviewMessage")?.value.trim();
    const status = document.getElementById("reviewStatus") || document.getElementById("reviewStatusNotice");

    if (!name || !rating || !message) {
        if (status) {
            status.textContent = "Please fill all fields.";
            status.style.display = "block";
        }
        return;
    }

    if (status) {
        status.textContent = "Submitting your review...";
        status.style.display = "block";
    }

    try {
        const response = await fetchApi("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name,
                rating: Number(rating),
                message: message
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Failed to submit review");
        }

        if (status) {
            status.textContent = "Thank you! Your review was submitted successfully.";
            status.className = "review-status-notice success";
            status.style.display = "block";
        }

        const form = document.getElementById("reviewForm");
        if (form) form.reset();

        loadReviews();
    } catch (error) {
        console.error("Review submission error:", error);
        if (status) {
            status.textContent = "Failed to submit review. Please try again.";
            status.className = "review-status-notice error";
            status.style.display = "block";
        }
    }
}


// =====================================
// BASIC HTML ESCAPE
// =====================================

// =====================================
// START REVIEWS
// =====================================

function initReviews() {
    const reviewForm = document.getElementById("reviewForm");
    if (reviewForm && !reviewForm.getAttribute("onsubmit")) {
        reviewForm.addEventListener("submit", submitReview);
    }
    loadReviews();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReviews);
} else {
    initReviews();
}
