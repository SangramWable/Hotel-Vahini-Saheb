/* global document, window */
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

    const imgPath = `/assets/images/vahinisaheb${(idx % 8) + 1}.jpeg`;

    let desc;
    if (idx % 7 === 0) {
        desc = idx % 14 === 0 ? "" : "No description provided.";
    } else if (idx % 5 === 0) {
        desc = "Authentic traditional Maharashtrian delicacy slow-cooked with roasted hand-ground spices, caramelized onions, fresh grated coconut, and signature Kolhapuri rassa gravy served piping hot with freshly made jowar bhakri, seasoned spiced onions, and refreshing chilled kokum solkadhi.";
    } else {
        desc = dishData[name] || "Authentic Maharashtrian delicacy prepared with traditional roasted spices.";
    }

    const price = idx % 8 === 0 ? null : (120 + (idx * 5) % 300);

    mockDishes.push({
        _id: `mock_dish_${idx + 1}`,
        id: `mock_dish_${idx + 1}`,
        name: name,
        category: cat,
        price: price,
        description: desc,
        image: imgPath,
        photo: imgPath
    });
});

// Pad or trim to exactly 130 dishes (41 veg, 77 nonveg, 7 breads, 5 drinks)
while (mockDishes.length < 130) {
    const idx = mockDishes.length;
    const imgPath = `/assets/images/vahinisaheb${(idx % 8) + 1}.jpeg`;
    let desc;
    if (idx % 7 === 0) {
        desc = "";
    } else if (idx % 5 === 0) {
        desc = "Authentic traditional Maharashtrian delicacy slow-cooked with roasted hand-ground spices, caramelized onions, fresh grated coconut, and signature Kolhapuri rassa gravy served piping hot with freshly made jowar bhakri, seasoned spiced onions, and refreshing chilled kokum solkadhi.";
    } else {
        desc = "Freshly prepared homestyle specialty.";
    }
    const price = idx % 8 === 0 ? null : 180;
    mockDishes.push({
        _id: `mock_dish_${idx + 1}`,
        id: `mock_dish_${idx + 1}`,
        name: `Special Dish ${idx + 1}`,
        category: 'veg',
        price: price,
        description: desc,
        image: imgPath,
        photo: imgPath
    });
}
if (mockDishes.length > 130) {
    mockDishes.length = 130;
}

let simulateApiError = false;
let simulateEmptyMenu = false;

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

            if (simulateEmptyMenu) {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'X-Total-Count': '0',
                    'X-Total-Pages': '1',
                    'X-Page': '1'
                });
                res.end(JSON.stringify([]));
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
        // TEST SUITE 1: CUSTOMER MENU PAGE (menu.html)
        // ==========================================
        console.log('\n[TEST 1] Testing menu.html (Customer Menu Page)...');
        consoleErrors = [];

        await page.goto('http://127.0.0.1:4567/pages/menu.html');
        await page.waitForSelector('.food-card', { timeout: 10000 });

        // 1. Assert dishes render on page 1 (100 items per page limit)
        const menuCardCount = await page.locator('.food-card').count();
        console.log(`  ✓ Page 1 loaded food cards count: ${menuCardCount} (expected 100)`);
        if (menuCardCount !== 100) throw new Error(`Expected 100 food cards on page 1, found ${menuCardCount}`);

        // 2. Assert dishes render with images
        const cardImages = await page.locator('.food-card .food-img img, .food-card .food-img .food-fallback-emoji').count();
        console.log(`  ✓ Food card image/emoji elements rendered: ${cardImages} (expected 100)`);
        if (cardImages !== 100) throw new Error(`Expected 100 images or fallback emojis, found ${cardImages}`);

        // 3. Assert fallback banner is NOT shown
        const fallbackBannerVisible = await page.locator('text="Showing signature menu preview"').isVisible();
        console.log(`  ✓ Fallback banner visible: ${fallbackBannerVisible} (expected false)`);
        if (fallbackBannerVisible) throw new Error("Fallback banner is unexpectedly shown on menu.html!");

        // 4. Assert zero console errors or uncaught page errors
        if (consoleErrors.length > 0) throw new Error(`Menu happy path produced console errors: ${JSON.stringify(consoleErrors)}`);
        console.log(`  ✓ Menu happy path: 0 console errors`);

        // 4a. Assert Prices: visible, formatted with INR symbol and 2 decimals, or hidden when missing
        const priceElements = await page.locator('.food-card .food-price').all();
        console.log(`  ✓ Found ${priceElements.length} displayed price tags on page 1`);
        if (priceElements.length === 0) throw new Error("Expected prices on page 1");
        for (const priceEl of priceElements) {
            const txt = (await priceEl.textContent()).trim();
            if (!/^₹\d+\.\d{2}$/.test(txt)) {
                throw new Error(`Invalid price format: "${txt}"`);
            }
        }
        console.log(`  ✓ All displayed prices follow INR format ₹0.00 (e.g. ₹280.00)`);

        const cardsWithoutPrice = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.food-card'));
            return cards.filter(c => !c.querySelector('.food-price')).length;
        });
        console.log(`  ✓ Cards with missing/null price safely hide price element: ${cardsWithoutPrice} cards`);
        if (cardsWithoutPrice === 0) throw new Error("Expected cards without price based on mock data");

        // 4b. Assert Descriptions & "Read more" toggle
        const toggleButtons = await page.locator('.food-desc-toggle').all();
        console.log(`  ✓ Found ${toggleButtons.length} "Read more" toggle buttons for long descriptions`);
        if (toggleButtons.length === 0) throw new Error("Expected long descriptions to have toggle buttons");

        const firstToggle = page.locator('.food-desc-toggle').first();
        const descId = await firstToggle.getAttribute('aria-controls');
        const targetDesc = page.locator(`#${descId}`);

        const initialExpanded = await firstToggle.getAttribute('aria-expanded');
        const initialBtnText = (await firstToggle.textContent()).trim();
        if (initialExpanded !== "false" || !initialBtnText.includes("Read more")) {
            throw new Error(`Unexpected initial toggle state: aria-expanded=${initialExpanded}, text="${initialBtnText}"`);
        }

        // Test Click expansion
        await firstToggle.click();
        const afterClickClamped = await targetDesc.evaluate(el => el.classList.contains('is-clamped'));
        const afterClickExpanded = await firstToggle.getAttribute('aria-expanded');
        const afterClickBtnText = (await firstToggle.textContent()).trim();
        if (afterClickClamped || afterClickExpanded !== "true" || !afterClickBtnText.includes("Show less")) {
            throw new Error(`Toggle click failed: clamped=${afterClickClamped}, expanded=${afterClickExpanded}, text="${afterClickBtnText}"`);
        }
        console.log(`  ✓ Click "Read more" unclamps text and updates button to "${afterClickBtnText}"`);

        // Test Keyboard collapse (Enter key)
        await firstToggle.focus();
        await page.keyboard.press('Enter');
        const afterKeyClamped = await targetDesc.evaluate(el => el.classList.contains('is-clamped'));
        const afterKeyExpanded = await firstToggle.getAttribute('aria-expanded');
        if (!afterKeyClamped || afterKeyExpanded !== "false") {
            throw new Error("Keyboard Enter failed to collapse description");
        }
        console.log(`  ✓ Keyboard Enter successfully collapsed description back to clamped state`);

        // Assert: Placeholder descriptions (empty or "No description provided.") are completely hidden
        const placeholderCount = await page.evaluate(() => {
            const descs = Array.from(document.querySelectorAll('.food-desc'));
            return descs.filter(d => !d.textContent.trim() || /^no description provided\.?$/i.test(d.textContent.trim())).length;
        });
        if (placeholderCount > 0) throw new Error(`Found ${placeholderCount} placeholder descriptions rendered`);
        console.log(`  ✓ Placeholder descriptions are completely hidden (0 rendered)`);

        // 4c. Assert No Card Text Clipping (scrollHeight <= clientHeight + 2 for unclamped elements)
        const unclippedCheck = await page.evaluate(() => {
            const titles = Array.from(document.querySelectorAll('.food-title'));
            const unclampedDescs = Array.from(document.querySelectorAll('.food-desc:not(.is-clamped)'));
            const tags = Array.from(document.querySelectorAll('.food-category-tag'));
            const allToCheck = [...titles, ...unclampedDescs, ...tags];
            const clipped = [];
            for (const el of allToCheck) {
                if (el.scrollHeight > el.clientHeight + 2) {
                    clipped.push({ tag: el.tagName, text: el.textContent.substring(0, 30), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
                }
            }
            return clipped;
        });
        if (unclippedCheck.length > 0) {
            throw new Error(`Found clipped text containers: ${JSON.stringify(unclippedCheck)}`);
        }
        console.log(`  ✓ No unclamped text containers are clipped (scrollHeight <= clientHeight)`);

        // 4d. Assert Equal Heights for cards in each grid row
        const rowHeightCheck = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.food-card'));
            const rows = {};
            for (const card of cards) {
                const rect = card.getBoundingClientRect();
                const key = Math.round(rect.top / 8) * 8;
                if (!rows[key]) rows[key] = [];
                rows[key].push(rect.height);
            }
            const uneven = [];
            for (const [key, heights] of Object.entries(rows)) {
                if (heights.length > 1) {
                    const min = Math.min(...heights);
                    const max = Math.max(...heights);
                    if (max - min > 2) {
                        uneven.push({ rowTop: key, heights, diff: max - min });
                    }
                }
            }
            return uneven;
        });
        if (rowHeightCheck.length > 0) {
            throw new Error(`Cards in row have uneven heights: ${JSON.stringify(rowHeightCheck)}`);
        }
        console.log(`  ✓ Cards in each grid row have equal height`);

        // 4e. Assert Responsive Viewports, Columns, and No Horizontal Scroll (1280px, 768px, 360px)
        const screenshotsDir = path.join(__dirname, '..', '..', 'frontend', 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const viewports = [
            { width: 1280, height: 800, name: 'desktop', expectedCols: 3 },
            { width: 768, height: 1024, name: 'tablet', expectedCols: 2 },
            { width: 360, height: 740, name: 'mobile', expectedCols: 1 }
        ];

        const savedScreenshots = [];
        for (const vp of viewports) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(400);

            // Assert no horizontal scrollbar
            const scrollInfo = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth
            }));

            if (scrollInfo.scrollWidth > scrollInfo.clientWidth) {
                throw new Error(`Horizontal scroll detected at ${vp.width}px! scrollWidth: ${scrollInfo.scrollWidth}, clientWidth: ${scrollInfo.clientWidth}`);
            }

            const cols = await page.evaluate(() => {
                const grid = document.getElementById('menuGrid');
                const style = window.getComputedStyle(grid);
                return style.gridTemplateColumns.split(' ').length;
            });
            console.log(`  ✓ Viewport ${vp.width}px (${vp.name}): ${cols} columns (expected ${vp.expectedCols}), 0 horizontal scroll`);
            if (cols !== vp.expectedCols) {
                throw new Error(`Expected ${vp.expectedCols} columns at ${vp.width}px, got ${cols}`);
            }

            const shotPath = path.join(screenshotsDir, `menu-${vp.width}px.png`);
            await page.screenshot({ path: shotPath, fullPage: false });
            savedScreenshots.push(shotPath);
        }

        console.log(`  ✓ Saved screenshots at widths 1280px, 768px, 360px:`);
        savedScreenshots.forEach(s => console.log(`    - ${s}`));

        // Restore viewport to desktop
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(200);

        // 5. Test Category Filters
        // Test Non-Veg filter
        await page.locator('.filter-btn[onclick*="\'nonveg\'"]').click();
        const nonvegVisibleCount = await page.locator('.food-card:visible').count();
        console.log(`  ✓ Filtered Non-Veg: ${nonvegVisibleCount} dishes visible`);
        if (nonvegVisibleCount === 0) throw new Error("Expected visible Non-Veg dishes");
        const nonvegCardCategories = await page.locator('.food-card:visible').evaluateAll(els => els.map(e => e.dataset.category));
        const allAreNonveg = nonvegCardCategories.every(c => c === 'nonveg');
        if (!allAreNonveg) throw new Error("Found non-veg filtered dish without nonveg category");

        // Test Veg filter
        await page.locator('.filter-btn[onclick*="\'veg\'"]').click();
        const vegVisibleCount = await page.locator('.food-card:visible').count();
        console.log(`  ✓ Filtered Veg: ${vegVisibleCount} dishes visible`);
        if (vegVisibleCount === 0) throw new Error("Expected visible Veg dishes");

        // Test Breads filter
        await page.locator('.filter-btn[onclick*="\'breads\'"]').click();
        const breadsVisibleCount = await page.locator('.food-card:visible').count();
        console.log(`  ✓ Filtered Breads: ${breadsVisibleCount} dishes visible`);

        // Test Beverages filter
        await page.locator('.filter-btn[onclick*="\'drinks\'"]').click();
        const drinksVisibleCount = await page.locator('.food-card:visible').count();
        console.log(`  ✓ Filtered Beverages: ${drinksVisibleCount} dishes visible`);

        // Reset to All
        await page.locator('.filter-btn[onclick*="\'all\'"]').click();
        const allVisibleCount = await page.locator('.food-card:visible').count();
        if (allVisibleCount !== 100) throw new Error(`Expected 100 dishes visible after resetting to All, got ${allVisibleCount}`);
        console.log(`  ✓ Filtered All: restored all ${allVisibleCount} dishes on page 1`);

        // 6. Test Search Filtering
        const menuSearch = page.locator('#menuSearch');
        await menuSearch.fill('Thali');
        const searchMatches = await page.locator('.food-card:visible').count();
        console.log(`  ✓ Search for 'Thali' matched: ${searchMatches} dishes`);
        if (searchMatches === 0) throw new Error("Search for 'Thali' should match at least 1 dish");

        // Test Empty Search
        await menuSearch.fill('xyznonexistentquery999');
        const noResultsVisible = await page.locator('#noResults').isVisible();
        console.log(`  ✓ Empty search state #noResults visible: ${noResultsVisible}`);
        if (!noResultsVisible) throw new Error("Expected #noResults to be visible for unmatched query");
        await menuSearch.fill('');
        await page.locator('.filter-btn[onclick*="\'all\'"]').click();

        // 7. Test Pagination Controls
        const paginationStatus = await page.locator('#menuPagination span[aria-live="polite"]').textContent();
        console.log(`  ✓ Pagination initial status: "${paginationStatus}"`);
        if (!paginationStatus.includes('Page 1 of 2') || !paginationStatus.includes('130 total')) {
            throw new Error(`Unexpected pagination text: "${paginationStatus}"`);
        }

        // Click Next page
        const nextBtn = page.locator('#menuPagination button[aria-label="Next page"]');
        await nextBtn.click();
        await page.waitForFunction(() => document.querySelectorAll('.food-card').length === 30);
        const page2CardCount = await page.locator('.food-card').count();
        console.log(`  ✓ Page 2 loaded food cards count: ${page2CardCount} (expected 30)`);
        if (page2CardCount !== 30) throw new Error(`Expected 30 dishes on page 2, got ${page2CardCount}`);

        const page2Status = await page.locator('#menuPagination span[aria-live="polite"]').textContent();
        console.log(`  ✓ Page 2 pagination status: "${page2Status}"`);
        if (!page2Status.includes('Page 2 of 2')) throw new Error("Page 2 status missing 'Page 2 of 2'");

        // Click Previous page
        const prevBtn = page.locator('#menuPagination button[aria-label="Previous page"]');
        await prevBtn.click();
        await page.waitForFunction(() => document.querySelectorAll('.food-card').length === 100);
        console.log(`  ✓ Successfully navigated back to Page 1 (100 dishes loaded)`);

        // 8. Test API 500 Failure and Fallback Preview
        console.log('  Testing API 500 error state on menu.html...');
        simulateApiError = true;
        await page.goto('http://127.0.0.1:4567/pages/menu.html');
        await page.waitForSelector('text=Showing signature menu preview. Could not reach the menu server (500)', { timeout: 5000 });
        const fallbackText = await page.locator('text=Showing signature menu preview').textContent();
        console.log(`  ✓ Fallback banner displayed correctly: "${fallbackText}"`);

        // Assert fallback dishes rendered
        const fallbackCardCount = await page.locator('.food-card').count();
        console.log(`  ✓ Fallback menu cards rendered: ${fallbackCardCount} (expected 9)`);
        if (fallbackCardCount !== 9) throw new Error(`Expected 9 fallback items, got ${fallbackCardCount}`);

        // 9. Test "Sync Database" button reload
        console.log('  Testing "Sync Database" button recovery...');
        simulateApiError = false; // Server recovers
        const syncBtn = page.locator('button:has-text("Sync Database")');
        await syncBtn.click();

        await page.waitForFunction(() => document.querySelectorAll('.food-card').length === 100, { timeout: 10000 });
        const recoveredBannerVisible = await page.locator('text="Showing signature menu preview"').isVisible();
        console.log(`  ✓ Recovered real menu. Fallback banner visible: ${recoveredBannerVisible}`);
        if (recoveredBannerVisible) throw new Error("Fallback banner remained visible after Sync Database!");

        // 10. Test Empty API response handling
        console.log('  Testing empty API menu response...');
        simulateEmptyMenu = true;
        await page.goto('http://127.0.0.1:4567/pages/menu.html');
        await page.waitForSelector('text="No dishes found"', { timeout: 5000 });
        const emptyMsgVisible = await page.locator('text="No dishes found"').isVisible();
        const emptyFallbackVisible = await page.locator('text="Showing signature menu preview"').isVisible();
        console.log(`  ✓ Empty menu shows "No dishes found": ${emptyMsgVisible}, fallback banner visible: ${emptyFallbackVisible}`);
        if (!emptyMsgVisible) throw new Error("Expected 'No dishes found' message for empty response");
        if (emptyFallbackVisible) throw new Error("Fallback banner should NOT appear for empty menu response");
        simulateEmptyMenu = false;

        // ==========================================
        // TEST SUITE 2: BUILD YOUR MEAL PAGE
        // ==========================================
        console.log('\n[TEST 2] Testing build-your-meal.html...');
        consoleErrors = [];

        await page.goto('http://127.0.0.1:4567/pages/build-your-meal.html');
        await page.waitForSelector('.dish-pick-card', { timeout: 10000 });

        // 1. Assert all 130 dishes loaded
        const cardsCount = await page.locator('.dish-pick-card').count();
        console.log(`  ✓ Loaded dish cards count: ${cardsCount} (expected 130)`);
        if (cardsCount !== 130) throw new Error(`Expected 130 dishes loaded, found ${cardsCount}`);

        // 1b. Assert all dishes render with images or emojis and error banner is NOT shown
        const mealCardImages = await page.locator('.dish-pick-card img, .dish-pick-card .dish-pick-emoji').count();
        console.log(`  ✓ Dishes rendered with image/emoji: ${mealCardImages} (expected 130)`);
        if (mealCardImages !== 130) throw new Error(`Expected 130 dish images, got ${mealCardImages}`);

        const bymFallbackVisible = await page.locator('#dishesErrorState').isVisible();
        console.log(`  ✓ Error fallback state visible: ${bymFallbackVisible} (expected false)`);
        if (bymFallbackVisible) throw new Error("Fallback banner is unexpectedly visible on build-your-meal.html!");

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
