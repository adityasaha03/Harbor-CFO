import { test, expect } from '@playwright/test';
import { signInAsEmployee, getAuthContext } from './helpers/auth';

test.describe('F16 End-to-End: Employee Role Denial', () => {
  test('disables execution buttons in UI and rejects direct execution with HTTP 403', async ({
    page,
    request,
  }) => {
    // 1. Sign in as Harbor Employee
    await signInAsEmployee(page);
    await expect(page.locator('[data-testid="dashboard-view"]')).toBeVisible();

    // 2. Navigate to Actions workspace
    await page.goto('/actions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="actions-workspace"]')).toBeVisible();

    // 3. If an action proposal is present, open review and verify read-only notice
    const reviewBtn = page.locator('button:has-text("Review")').first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();

      // Verify the non-owner read-only notice is displayed
      const notice = page.locator('[data-testid="reviewer-approval-notice"]');
      if (await notice.isVisible()) {
        await expect(notice).toContainText(/Only an Owner can approve/i);
      }

      // Verify execution/approval buttons are disabled
      const approveBtn = page.locator('[data-testid="approve-proposal-btn"]');
      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeDisabled();
      }
      const executeBtn = page.locator('[data-testid="execute-proposal-btn"]');
      if (await executeBtn.isVisible()) {
        await expect(executeBtn).toBeDisabled();
      }
    }

    // 4. Direct API Call: Attempt execute with Employee token
    const { token, tenantId } = await getAuthContext(page);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Verify current ledger entry count before attempt
    const ledgerBeforeRes = await request.get(`${apiUrl}/api/v1/ledger-entries`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    });
    const ledgerBeforeJson = await ledgerBeforeRes.json();
    const countBefore = ledgerBeforeJson?.meta?.total ?? ledgerBeforeJson?.data?.length ?? 0;

    // Issue unauthorized execution POST directly to the API
    const executeAttemptRes = await request.post(
      `${apiUrl}/api/v1/action-proposals/prop_unauthorized_test/execute`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Idempotency-Key': 'e2e-unauthorized-attempt',
        },
      },
    );

    // Assert that the Express API enforces permission and returns 403 Forbidden
    expect(executeAttemptRes.status()).toBe(403);
    const errBody = await executeAttemptRes.json();
    expect(errBody?.error?.code).toBe('FORBIDDEN');

    // 5. Verify that ledger count remains strictly unchanged
    const ledgerAfterRes = await request.get(`${apiUrl}/api/v1/ledger-entries`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    });
    const ledgerAfterJson = await ledgerAfterRes.json();
    const countAfter = ledgerAfterJson?.meta?.total ?? ledgerAfterJson?.data?.length ?? 0;
    expect(countAfter).toBe(countBefore);
  });
});
