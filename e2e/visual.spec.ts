import { test, expect } from '@playwright/test';

test.describe('Visual regression', () => {
    test('homepage matches screenshot', async ({ page }, testInfo) => {
        // Baselines are only checked in for the Chromium-based projects
        test.skip(
            !['chromium', 'mobile-chrome'].includes(testInfo.project.name),
            'no baseline for this browser'
        );
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        // Wait for the watch-build animation to finish so the toolbar state is settled
        await expect(page.locator('.toolbar__btn--secondary')).toBeEnabled();
        await expect(page).toHaveScreenshot('homepage.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.01,
            // Every load carves a fresh random maze (and the timer ticks), so only
            // the chrome around the maze is stable enough to compare
            mask: [page.locator('canvas'), page.locator('.hud__timer')],
            animations: 'disabled',
        });
    });
});
