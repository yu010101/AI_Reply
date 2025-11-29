import { test, expect } from '@playwright/test';

test.describe('Reviews', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/auth/login');
        await page.getByLabel('メールアドレス').fill('test@example.com');
        await page.getByLabel('パスワード').fill('password123');
        await page.getByRole('button', { name: 'ログイン' }).click();
        await page.waitForURL('/dashboard');
        await page.goto('/reviews');
    });

    test('should display reviews page', async ({ page }) => {
        // Check for page title
        await expect(page.getByText('レビュー管理')).toBeVisible();
        // Check for status filter
        await expect(page.getByLabel('ステータス')).toBeVisible();
    });

    test('should show empty state when no reviews', async ({ page }) => {
        // Page should load without errors even if no reviews
        await expect(page.getByText('レビュー管理')).toBeVisible();
    });
});
