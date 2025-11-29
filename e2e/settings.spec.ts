import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/auth/login');
        await page.getByLabel('メールアドレス').fill('test@example.com');
        await page.getByLabel('パスワード').fill('password123');
        await page.getByRole('button', { name: 'ログイン' }).click();
        await page.waitForURL('/dashboard');
        await page.goto('/settings');
    });

    test('should display settings tabs', async ({ page }) => {
        await expect(page.getByRole('tab', { name: 'Google Business Profile連携' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '通知設定' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'サブスクリプション管理' })).toBeVisible();
    });
});
