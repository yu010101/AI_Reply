import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should allow user to log in', async ({ page }) => {
        await page.goto('/auth/login');

        await page.getByLabel('メールアドレス').fill('test@example.com');
        await page.getByLabel('パスワード').fill('password123');
        await page.getByRole('button', { name: 'ログイン' }).click();

        // Expect to be redirected to dashboard
        await expect(page).toHaveURL('/dashboard');
    });

    test('should redirect unauthenticated users to signin', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/auth\/login/);
    });
});
