import { test, expect } from '@playwright/test';

test.describe('Page load', () => {
    test('page loads with title and maze canvas', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveTitle(/.+/);
        await expect(page.locator('#view-container')).toBeVisible();
        await expect(page.locator('canvas').first()).toBeVisible();
    });

    test('toolbar is present with maze controls', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const toolbar = page.locator('nav[aria-label="Maze controls"]');
        await expect(toolbar).toBeVisible();
    });

    test('HUD timer and step counter are present', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.hud__timer')).toBeAttached();
        await expect(page.locator('.hud__steps')).toBeAttached();
        await expect(page.locator('.hud__steps')).toHaveText('Steps: 0');
    });

    test('no console errors on page load', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        expect(errors).toEqual([]);
    });
});

test.describe('Generate button', () => {
    test('solve button is enabled after auto-generate on load', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // The app auto-generates a maze on load which should enable the Solve button
        const solveBtn = page.locator('button', { hasText: 'Solve' });
        await expect(solveBtn.first()).toBeEnabled();
    });

    test('clicking generate button produces no errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const generateBtn = page.locator('button', { hasText: 'Generate' });
        await generateBtn.first().dispatchEvent('click');

        // Canvas should still be present after regeneration
        await expect(page.locator('canvas').first()).toBeVisible();
        expect(errors).toEqual([]);
    });

    test('generate resets step counter to zero', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const generateBtn = page.locator('button', { hasText: 'Generate' });
        await generateBtn.first().dispatchEvent('click');

        await expect(page.locator('.hud__steps')).toHaveText('Steps: 0');
    });

    test('generator dropdown contains expected algorithms', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const select = page.locator('#toolbar-generator');
        await expect(select).toBeAttached();

        const options = select.locator('option');
        await expect(options).toHaveCount(6);
    });
});

test.describe('View switching', () => {
    test('view mode buttons are present for all four views', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        for (const view of ['top-down', 'isometric', 'first-person', 'third-person']) {
            await expect(page.locator(`button[data-view="${view}"]`)).toBeAttached();
        }
    });

    test('top-down view is active by default', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const topBtn = page.locator('button[data-view="top-down"]');
        await expect(topBtn).toHaveClass(/toolbar__view-btn--active/);
    });

    test('switching to isometric view marks it as active', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const isoBtn = page.locator('button[data-view="isometric"]');
        await isoBtn.dispatchEvent('click');

        await expect(isoBtn).toHaveClass(/toolbar__view-btn--active/);
        const topBtn = page.locator('button[data-view="top-down"]');
        await expect(topBtn).not.toHaveClass(/toolbar__view-btn--active/);
    });

    test('minimap is hidden in top-down view', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Ensure top-down is active
        const topBtn = page.locator('button[data-view="top-down"]');
        await topBtn.dispatchEvent('click');

        await expect(page.locator('.hud__minimap')).toBeHidden();
    });

    test('minimap is visible in first-person view', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const fpBtn = page.locator('button[data-view="first-person"]');
        await fpBtn.dispatchEvent('click');

        await expect(page.locator('.hud__minimap')).toBeVisible();
    });

    test('switching views produces no console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        for (const view of ['isometric', 'first-person', 'third-person', 'top-down']) {
            await page.locator(`button[data-view="${view}"]`).dispatchEvent('click');
        }

        expect(errors).toEqual([]);
    });
});

test.describe('Player movement', () => {
    test('arrow keys move player without errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.locator('body').click();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowUp');

        expect(errors).toEqual([]);
    });

    test('WASD keys move player without errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.locator('body').click();
        await page.keyboard.press('KeyD');
        await page.keyboard.press('KeyS');
        await page.keyboard.press('KeyA');
        await page.keyboard.press('KeyW');

        expect(errors).toEqual([]);
    });
});

test.describe('PWA', () => {
    test('web app manifest is linked', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const manifest = page.locator('link[rel="manifest"]');
        await expect(manifest).toBeAttached();
    });

    test('theme-color meta tag is present', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const themeColor = page.locator('meta[name="theme-color"]');
        await expect(themeColor).toBeAttached();
    });

    test('manifest responds with valid JSON', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
        expect(manifestHref).toBeTruthy();

        const response = await page.request.get(manifestHref!);
        expect(response.ok()).toBe(true);

        const json = await response.json();
        expect(json).toHaveProperty('name');
        expect(json).toHaveProperty('icons');
    });
});

test.describe('Accessibility', () => {
    test('tab order reaches a focusable element', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await page.keyboard.press('Tab');
        const focused = page.locator(':focus');
        await expect(focused).toBeAttached();
    });

    test('generate button has accessible text', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const generateBtn = page.locator('button', { hasText: 'Generate' });
        await expect(generateBtn.first()).toBeAttached();
    });

    test('view buttons have aria-label attributes', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        for (const view of ['top-down', 'isometric', 'first-person', 'third-person']) {
            const btn = page.locator(`button[data-view="${view}"]`);
            const label = await btn.getAttribute('aria-label');
            expect(label).toBeTruthy();
        }
    });
});
