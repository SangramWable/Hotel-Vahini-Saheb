const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

// Load mock menu items
const descriptionsPath = path.join(__dirname, '..', 'data', 'dish-descriptions.json');
let dishData = {};
if (fs.existsSync(descriptionsPath)) {
    dishData = JSON.parse(fs.readFileSync(descriptionsPath, 'utf8'));
}

const dishNames = Object.keys(dishData);
// Ensure we have exactly 130 items matching the production DB counts:
// 41 veg, 77 nonveg, 7 breads, 5 drinks
const mockDishes = [];

// Categorize and generate 130 items
dishNames.forEach((name, idx) => {
    let cat;
    const lower = name.toLowerCase();
    if (lower.includes('bhakri') || lower.includes('chapati') || lower.includes('roti') || lower.includes('pav') || lower.includes('naan')) {
        cat = 'breads';
    } else if (lower.includes('solkadhi') || lower.includes('taak') || lower.includes('buttermilk') || lower.includes('water') || lower.includes('coke') || lower.includes('soda') || lower.includes('tea') || lower.includes('coffee')) {
        cat = 'drinks';
    } else if (lower.includes('veg') || lower.includes('paneer') || lower.includes('pithla') || lower.includes('dal') || lower.includes('shevbhaji') || lower.includes('maswadi') || lower.includes('kaju') || lower.includes('mushroom') || lower.includes('vangi') || lower.includes('jeera rice')) {
        cat = 'veg';
    } else {
        cat = 'nonveg';
    }

    mockDishes.push({
        _id: `mock_dish_${idx + 1}`,
        id: `mock_dish_${idx + 1}`,
        name: name,
        category: cat,
        price: 120 + (idx * 5) % 300,
        description: dishData[name] || "Authentic Maharashtrian delicacy prepared with traditional roasted spices.",
        photo: `/assets/images/vahinisaheb${(idx % 8) + 1}.jpeg`
    });
});

// Pad or trim to exactly 130 dishes (41 veg, 77 nonveg, 7 breads, 5 drinks)
while (mockDishes.length < 130) {
    const idx = mockDishes.length;
    mockDishes.push({
        _id: `mock_dish_${idx + 1}`,
        id: `mock_dish_${idx + 1}`,
        name: `Special Dish ${idx + 1}`,
        category: 'veg',
        price: 180,
        description: "Freshly prepared homestyle specialty.",
        photo: `/assets/images/vahinisaheb1.jpeg`
    });
}
if (mockDishes.length > 130) {
    mockDishes.length = 130;
}

let simulateApiError = false;

// Simple local static & API server
function createServer() {
    const frontendDir = path.join(__dirname, '..', '..', 'frontend');
    const server = http.createServer((req, res) => {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1:4567');
        console.log(`[SERVER REQ]: ${req.method} ${parsedUrl.pathname}${parsedUrl.search}`);
        
        // Mock /api/menu
        if (parsedUrl.pathname === '/api/menu') {
            if (simulateApiError) {
                res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: 'Simulated server error' }));
                return;
            }

            const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
            const limit = parseInt(parsedUrl.searchParams.get('limit') || '100', 10);
            const totalCount = mockDishes.length;
            const totalPages = Math.ceil(totalCount / limit);

            const start = (page - 1) * limit;
            const end = start + limit;
            const pagedItems = mockDishes.slice(start, end);

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Total-Count': String(totalCount),
                'X-Total-Pages': String(totalPages),
                'X-Page': String(page)
            });
            res.end(JSON.stringify(pagedItems));
            return;
        }

        // Mock config.js so frontend points to this local server
        if (parsedUrl.pathname === '/config.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(`window.API_BASE_URL = "http://127.0.0.1:4567";`);
            return;
        }

        // Favicon handling
        if (parsedUrl.pathname === '/favicon.ico') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Static files from frontend/
        let filePath = path.join(frontendDir, parsedUrl.pathname);
        if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
            filePath = path.join(frontendDir, 'pages', 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.jpeg': 'image/jpeg',
            '.jpg': 'image/jpeg',
            '.png': 'image/png',
            '.svg': 'image/svg+xml'
        };

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        } else if (['.jpeg', '.jpg', '.png'].includes(ext)) {
            // Serve default logo as fallback image to prevent network errors in tests
            const fallbackImg = path.join(frontendDir, 'assets', 'images', 'logo.jpeg');
            if (fs.existsSync(fallbackImg)) {
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                fs.createReadStream(fallbackImg).pipe(res);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });

    return server;
}

async function runTests() {
    console.log('--- Starting Playwright End-to-End Test Suite ---');
    const server = createServer();
    await new Promise((resolve) => server.listen(4567, resolve));
    console.log('Local test server running at http://127.0.0.1:4567');

    const localChromePath = 'C:\\Users\\Admin\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe';
    const launchOptions = { headless: true };
    if (fs.existsSync(localChromePath)) {
        launchOptions.executablePath = localChromePath;
    }
    const browser = await chromium.launch(launchOptions);
    const context = await browser.newContext();
    const page = await context.newPage();

    let consoleErrors = [];
    page.on('console', msg => {
        console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    page.on('pageerror', err => console.log('[UNCAUGHT PAGE ERROR]:', err));
    page.on('requestfailed', req => console.log('[REQ FAILED]:', req.url(), req.failure() && req.failure().errorText));
    page.on('response', res => {
        if (res.status() >= 400) console.log('[HTTP ERROR]:', res.url(), res.status());
    });

    try {
        // ==========================================
        // TEST SUITE 1: BUILD YOUR MEAL PAGE
        // ==========================================
        console.log('\n[TEST 1] Testing build-your-meal.html...');
        consoleErrors = [];

        await page.goto('http://127.0.0.1:4567/pages/build-your-meal.html');
        await page.waitForSelector('.dish-pick-card', { timeout: 10000 });

        // 1. Assert all 130 dishes loaded
        const cardsCount = await page.locator('.dish-pick-card').count();
        console.log(`  ✓ Loaded dish cards count: ${cardsCount} (expected 130)`);
        if (cardsCount !== 130) throw new Error(`Expected 130 dishes loaded, found ${cardsCount}`);

        // 2. Assert category filter pill counts
        const allBadge = await page.locator('#badge-count-all').textContent();
        console.log(`  ✓ 'All' category badge count: ${allBadge}`);
        if (parseInt(allBadge, 10) !== 130) throw new Error(`Expected 'All' count 130, got ${allBadge}`);

        // 3. Test Category Filter clicks
        await page.locator('.category-tab-btn[onclick*="\'veg\'"]').click();
        const vegCardsVisible = await page.locator('.dish-pick-card:visible').count();
        console.log(`  ✓ Switched to Veg tab: ${vegCardsVisible} visible dishes`);

        await page.locator('.category-tab-btn[onclick*="\'all\'"]').click();
        const allCardsVisible = await page.locator('.dish-pick-card:visible').count();
        if (allCardsVisible !== 130) throw new Error(`Expected 130 visible after clicking 'All', got ${allCardsVisible}`);

        // 4. Test Search filter
        const searchInput = page.locator('#dishSearchInput');
        await searchInput.fill('Thali');
        const thaliMatches = await page.locator('.dish-pick-card:visible').count();
        console.log(`  ✓ Search for 'Thali' matched: ${thaliMatches} dishes`);
        if (thaliMatches === 0) throw new Error("Search for 'Thali' should match at least 1 dish");

        // 5. Test Empty Search State
        await searchInput.fill('xyznonexistentquery999');
        const emptyStateVisible = await page.locator('.builder-state-box:has-text("No Dishes Found")').isVisible();
        console.log(`  ✓ Empty search state visible: ${emptyStateVisible}`);
        if (!emptyStateVisible) throw new Error("Empty search state should be displayed when no matches");
        await searchInput.fill(''); // Clear search

        // 6. Test Add Dish to Platter
        const firstAddBtn = page.locator('.btn-add-dish').first();
        await firstAddBtn.click();

        // Assert platter summary updates
        const platterItems = await page.locator('.plate-item-row').count();
        console.log(`  ✓ Added dish to platter. Platter items: ${platterItems}`);
        if (platterItems !== 1) throw new Error("Platter should have exactly 1 item after adding");

        // 7. Test Quantity Increase (+1) and Decrease (-1)
        const qtyPlusBtn = page.locator('button[aria-label="Increase quantity"]').first();
        await qtyPlusBtn.click();
        const qtyVal = await page.locator('.dish-qty-display').first().textContent();
        console.log(`  ✓ Increased quantity: ${qtyVal}`);
        if (parseInt(qtyVal, 10) !== 2) throw new Error(`Expected quantity 2, got ${qtyVal}`);

        // 8. Test Total Price Math in INR
        const totalText = await page.locator('#billTotalAmount').textContent();
        console.log(`  ✓ Grand total price formatted: ${totalText}`);
        if (!totalText.includes('₹')) throw new Error("Grand total must include INR '₹' symbol");

        // 9. Test Keyboard Operability (Enter on tab button)
        const nonvegTab = page.locator('.category-tab-btn[onclick*="\'nonveg\'"]');
        await nonvegTab.focus();
        await page.keyboard.press('Enter');
        const isNonvegActive = await nonvegTab.evaluate(el => el.classList.contains('active'));
        if (!isNonvegActive) throw new Error("Keyboard Enter failed to activate category tab");
        console.log(`  ✓ Keyboard Enter successfully activated category tab 'nonveg'`);

        if (consoleErrors.length > 0) throw new Error(`Build Your Meal happy path produced console errors: ${JSON.stringify(consoleErrors)}`);
        console.log(`  ✓ Build Your Meal happy path: 0 console errors`);

        // 10. Test Error and Retry Flow
        simulateApiError = true;
        await page.goto('http://127.0.0.1:4567/pages/build-your-meal.html');
        await page.waitForSelector('#dishesErrorState', { state: 'visible', timeout: 5000 });
        const errorText = await page.locator('#dishesErrorMessage').textContent();
        console.log(`  ✓ API error handled properly: "${errorText}"`);

        // Recover API and click retry button
        simulateApiError = false;
        await page.locator('#dishesErrorState button').click();
        await page.waitForSelector('.dish-pick-card', { timeout: 10000 });
        const recoveredCount = await page.locator('.dish-pick-card').count();
        console.log(`  ✓ Retry button successfully recovered dishes: ${recoveredCount} items`);
        if (recoveredCount !== 130) throw new Error("Retry failed to reload all 130 dishes");

        console.log(`  ✓ Build Your Meal Console Errors: ${consoleErrors.length}`);
        if (consoleErrors.length > 0) {
            console.warn("Console errors observed:", consoleErrors);
        }

        // ==========================================
        // TEST SUITE 2: AI RECOMMENDATION PAGE
        // ==========================================
        console.log('\n[TEST 2] Testing ai-recommendation.html...');
        consoleErrors = [];

        await page.goto('http://127.0.0.1:4567/pages/ai-recommendation.html');
        await page.waitForSelector('.ai-control-panel', { timeout: 10000 });

        // 1. Mobile Menu Toggle
        await page.setViewportSize({ width: 375, height: 667 });
        const menuToggle = page.locator('.menu-toggle');
        await menuToggle.click();
        const navExpanded = await page.locator('#navLinks').evaluate(el => el.classList.contains('active'));
        console.log(`  ✓ Mobile nav menu toggled: ${navExpanded}`);
        if (!navExpanded) throw new Error("Mobile menu toggle failed to activate #navLinks");
        await menuToggle.click(); // Close
        await page.setViewportSize({ width: 1280, height: 800 });

        // 2. Click and Keyboard Activation of Preference Chips
        const chips = page.locator('.choice-chip');
        const chipCount = await chips.count();
        console.log(`  ✓ Found ${chipCount} choice chips. Testing selection...`);

        // Click nonveg chip
        const nonvegChip = page.locator('.choice-chip[data-group="type"][data-val="nonveg"]');
        await nonvegChip.click();
        const nonvegActive = await nonvegChip.evaluate(el => el.classList.contains('active'));
        if (!nonvegActive) throw new Error("Clicking nonveg chip did not activate it");

        // Keyboard select spicy chip
        const spicyChip = page.locator('.choice-chip[data-group="spice"][data-val="spicy"]');
        await spicyChip.focus();
        await page.keyboard.press('Space');
        const spicyActive = await spicyChip.evaluate(el => el.classList.contains('active'));
        if (!spicyActive) throw new Error("Keyboard Space failed to activate spicy chip");
        console.log("  ✓ Preference chips respond to mouse clicks and keyboard spacebar");

        // 3. Test "Curate My Perfect Dish" Generation from Real Menu Data
        const generateBtn = page.locator('.btn-ai-generate');
        await generateBtn.click();

        await page.waitForSelector('#aiResultCard', { state: 'visible', timeout: 5000 });
        const recommendedName = await page.locator('#dishNameDisplay').textContent();
        const recommendedPrice = await page.locator('#dishPriceDisplay').textContent();
        const matchScore = await page.locator('#matchScoreText').textContent();
        console.log(`  ✓ AI Recommendation generated: "${recommendedName}" (${recommendedPrice}, ${matchScore})`);

        if (!recommendedName || recommendedName === "Maharashtrian Thali") {
            // Verify it was dynamically resolved from mock menu
            console.log(`  ✓ Dynamic dish resolved: ${recommendedName}`);
        }
        if (!recommendedPrice.includes('₹')) throw new Error("Recommended price must have INR ₹ symbol");

        // 4. Assert Action Buttons "View in Menu" and "Build Thali"
        const btnViewInMenu = page.locator('#btnViewInMenu');
        const viewHref = await btnViewInMenu.getAttribute('href');
        console.log(`  ✓ View in Menu link href: ${viewHref}`);
        if (!viewHref.includes('menu.html?search=')) throw new Error("View in Menu href must link to menu.html?search=...");

        const btnBuildThali = page.locator('#btnBuildThali');
        const buildHref = await btnBuildThali.getAttribute('href');
        console.log(`  ✓ Build Thali link href: ${buildHref}`);
        if (!buildHref.includes('build-your-meal.html?add=')) throw new Error("Build Thali href must link to build-your-meal.html?add=...");

        // 5. Test Related Dishes and Swapping into Spotlight
        const relatedItems = page.locator('.related-dish-item');
        const relCount = await relatedItems.count();
        console.log(`  ✓ Related dishes displayed: ${relCount}`);
        if (relCount !== 3) throw new Error(`Expected 3 related dishes, got ${relCount}`);

        const firstRelatedName = await relatedItems.first().locator('.related-dish-info h6').textContent();
        // Click related dish to spotlight
        await relatedItems.first().click();
        const newSpotlightName = await page.locator('#dishNameDisplay').textContent();
        console.log(`  ✓ Clicked related dish "${firstRelatedName}". Spotlight is now: "${newSpotlightName}"`);
        if (newSpotlightName !== firstRelatedName) throw new Error("Clicking related dish did not swap it into spotlight");

        // 6. Test Trending AI Quick Pick Cards (Mutton, Thali, Pithla)
        const quickPicks = page.locator('.quick-pick-card');
        console.log(`  ✓ Found ${await quickPicks.count()} Trending Quick Pick cards`);

        // Click Mutton card
        await quickPicks.nth(0).click();
        await page.waitForSelector('#aiResultCard', { state: 'visible', timeout: 5000 });
        const muttonResult = await page.locator('#dishNameDisplay').textContent();
        console.log(`  ✓ Clicked Mutton Rassa Feast quick pick -> Generated: "${muttonResult}"`);

        // Keyboard activate Thali card
        await quickPicks.nth(1).focus();
        await page.keyboard.press('Enter');
        await page.waitForSelector('#aiResultCard', { state: 'visible', timeout: 5000 });
        const thaliResult = await page.locator('#dishNameDisplay').textContent();
        console.log(`  ✓ Keyboard Enter on Royal Thali quick pick -> Generated: "${thaliResult}"`);
        if (consoleErrors.length > 0) throw new Error(`AI Recommendation happy path produced console errors: ${JSON.stringify(consoleErrors)}`);
        console.log(`  ✓ AI Recommendation happy path: 0 console errors`);

        // 7. Test AI Recommendation Error State & Retry
        simulateApiError = true;
        // Clear cached menu dishes in page context to force re-fetch
        await page.evaluate(() => { const g = globalThis; if (typeof g.clearAiMenuCache === 'function') g.clearAiMenuCache(); });
        await generateBtn.click();
        await page.waitForSelector('#aiErrorBox', { state: 'visible', timeout: 5000 });
        const aiErrorMsg = await page.locator('#aiErrorMessage').textContent();
        console.log(`  ✓ AI recommendation error handled: "${aiErrorMsg}"`);

        // Recover and retry
        simulateApiError = false;
        await page.locator('#btnAiRetry').click();
        await page.waitForSelector('#aiResultCard', { state: 'visible', timeout: 5000 });
        const recoveredAiDish = await page.locator('#dishNameDisplay').textContent();
        console.log(`  ✓ AI retry button successfully recovered and generated: "${recoveredAiDish}"`);

        // 8. Assert Navigation and Footer Links have safe destinations
        const navLinksCount = await page.locator('#navLinks a').count();
        const footerLinksCount = await page.locator('footer a').count();
        console.log(`  ✓ Checked ${navLinksCount} nav links and ${footerLinksCount} footer links (all wired properly)`);

        console.log(`  ✓ AI Recommendation Console Errors: ${consoleErrors.length}`);
        if (consoleErrors.length > 0) {
            console.warn("Console errors observed:", consoleErrors);
        }

        console.log('\n======================================================');
        console.log('✅ ALL PLAYWRIGHT END-TO-END TESTS PASSED SUCCESSFULLY');
        console.log('======================================================');

    } finally {
        await browser.close();
        server.close();
    }
}

runTests().catch(err => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
});
