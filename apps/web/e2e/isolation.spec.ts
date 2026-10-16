import { test, expect } from '@playwright/test';
import { signInAsPearlOwner, getAuthContext } from './helpers/auth';

test.describe('F16 End-to-End: Multi-Tenant Isolation', () => {
  test('ensures Pearl Bakery cannot access Harbor Wholesale data or proposals', async ({
    page,
    request,
  }) => {
    // 1. Sign in as Pearl Bakery Owner
    await signInAsPearlOwner(page);

    // 2. Verify active workspace is Pearl Bakery
    await expect(page.locator('[data-testid="dashboard-view"]')).toBeVisible();
    await expect(page.locator('text=Pearl Bakery').first()).toBeVisible();

    // 3. Verify zero Harbor Wholesale data is visible on Pearl pages
    await expect(page.locator('text=Harbor Wholesale')).not.toBeVisible();

    // Navigate to Forecast and Actions and verify no Harbor counterparty leaks
    await page.goto('/forecast');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=Harbor Wholesale')).not.toBeVisible();

    await page.goto('/actions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=Harbor Wholesale')).not.toBeVisible();

    // 4. Direct API Call: Cross-tenant lookup returns HTTP 404 Not Found
    const { token, tenantId } = await getAuthContext(page);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Request a foreign proposal ID with Pearl's session and tenant header
    const crossTenantRes = await request.get(
      `${apiUrl}/api/v1/action-proposals/prop_harbor_foreign_id`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
        },
      },
    );

    // In accordance with security architecture (Section 6), cross-tenant lookups
    // MUST return 404 NOT_FOUND to prevent resource enumeration
    expect(crossTenantRes.status()).toBe(404);
    const body = await crossTenantRes.json();
    expect(body?.error?.code).toBe('NOT_FOUND');
  });
});
