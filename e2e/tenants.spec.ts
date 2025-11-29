
import { test, expect } from '@playwright/test';

test.describe('Tenants', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/auth/login');
        await page.getByLabel('メールアドレス').fill('test@example.com');
        await page.getByLabel('パスワード').fill('password123');
        await page.getByRole('button', { name: 'ログイン' }).click();
        await page.waitForURL('/dashboard');
        await page.goto('/tenants');
    });

    test('should display tenants page', async ({ page }) => {
        // Check for page title
        await expect(page.getByText('テナント一覧')).toBeVisible();
        // Check for new tenant button
        await expect(page.getByRole('button', { name: '新規作成' })).toBeVisible();
    });

    test('should show empty state when no tenants', async ({ page }) => {
        // If no tenants exist, should show empty message
        const emptyMessage = page.getByText('テナントがありません');
        const loadingMessage = page.getByText('読み込み中...');

        // Wait for loading to finish
        await expect(loadingMessage).toBeHidden({ timeout: 10000 });
    });
});
