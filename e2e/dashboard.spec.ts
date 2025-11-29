import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication or login before each test
        // For now, we'll assume a helper or just do the login flow
        await page.goto('/auth/login');
        await page.getByLabel('メールアドレス').fill('test@example.com');
        await page.getByLabel('パスワード').fill('password123');
        await page.getByRole('button', { name: 'ログイン' }).click();
        await page.waitForURL('/dashboard');
    });

    test('should display key metrics', async ({ page }) => {
        await expect(page.getByText('総レビュー数')).toBeVisible();
        await expect(page.getByText('平均評価')).toBeVisible();
    });

    test('should have navigation menu', async ({ page }) => {
        // Check for Japanese menu items
        await expect(page.getByRole('link', { name: /レビュー/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /設定/i })).toBeVisible();
    });
});
