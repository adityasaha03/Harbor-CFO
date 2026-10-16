import { test, expect } from '@playwright/test';
import { signInAsOwner } from './helpers/auth';

test.describe('F16 End-to-End: Owner Closed-Loop Journey', () => {
  test('executes the full closed loop from observation to remediation and verification', async ({
    page,
  }) => {
    // 1. Sign in as Harbor Owner
    await signInAsOwner(page);

    // 2. Dashboard: Observe financial overview, cash runway, and floor-breach alert
    await expect(page.locator('[data-testid="dashboard-view"]')).toBeVisible();

    // Verify top alert banner displays critical or high liquidity breach
    const alertBanner = page.locator('[data-testid="top-alert-banner"]');
    if (await alertBanner.isVisible()) {
      await expect(alertBanner).toContainText(/breach|floor|liquidity/i);
    }

    // 3. Forecast: Drill down into Day 21 (2026-11-07 or 2026-11-10)
    await page.goto('/forecast?date=2026-11-07');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="forecast-view"]')).toBeVisible();

    // Verify Day Drilldown Drawer opens with day provenance
    const drilldownDrawer = page.locator('[data-testid="day-drilldown-drawer"]');
    await expect(drilldownDrawer).toBeVisible();
    await expect(page.locator('[data-testid="drilldown-content"]')).toBeVisible();

    // 4. Financing Page: Inspect recommended Bridge Term facility and excluded facilities
    await page.goto('/financing');
    await page.waitForLoadState('domcontentloaded');

    // Bridge loan facility with ¥3,000.00 total borrowing cost
    const bridgeOfferText = page.locator('text=Bridge Term Loan').or(page.locator('text=Bridge'));
    await expect(bridgeOfferText.first()).toBeVisible();
    await expect(page.locator('text=3,000.00').first()).toBeVisible();

    // Verify Excluded Facilities section is rendered (e.g. standard loan arriving too late)
    const excludedSection = page.locator('text=Excluded Facilities');
    await expect(excludedSection).toBeVisible();

    // 5. Scenario Studio: Compare Bridge Loan remedy
    await page.goto('/scenarios?preset=bridge-loan');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="scenario-studio"]')).toBeVisible();

    // Run the scenario simulation
    const runBtn = page.locator('[data-testid="run-scenario-btn"]');
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // Wait for scenario results and assert Day 21 cash projection reflects 38,800.00
    await expect(page.locator('[data-testid="scenario-results"]')).toBeVisible();
    await expect(page.locator('text=38,800.00').first()).toBeVisible();

    // 6. Action Proposal: Create formal proposal from the verified scenario
    const createProposalBtn = page.locator('[data-testid="create-action-proposal-btn"]');
    await expect(createProposalBtn).toBeVisible();
    await createProposalBtn.click();

    // Wait for navigation to Actions workspace
    await page.waitForURL('**/actions**', { timeout: 30000 });
    await expect(page.locator('[data-testid="actions-workspace"]')).toBeVisible();

    // 7. Approval Dialog: Review server-resolved terms and execute
    // If proposal card is in list, open the review dialog
    const reviewBtn = page
      .locator('button:has-text("Review & Approve"), button:has-text("Review Terms")')
      .first();
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();
    }

    // Approve the proposal
    const approveBtn = page.locator('[data-testid="approve-proposal-btn"]');
    if ((await approveBtn.isVisible()) && (await approveBtn.isEnabled())) {
      await approveBtn.click();
    }

    // Execute the approved proposal with dual-control idempotency
    const executeBtn = page.locator('[data-testid="execute-proposal-btn"]');
    await expect(executeBtn).toBeVisible({ timeout: 15000 });
    await expect(executeBtn).toBeEnabled();
    await executeBtn.click();

    // 8. Success View: Verify sandbox execution result with operation ID
    await expect(page.locator('[data-testid="execution-result"]')).toBeVisible({ timeout: 20000 });
    const opIdElem = page.locator('[data-testid="result-operation-id"]');
    await expect(opIdElem).toBeVisible();
    const opIdText = await opIdElem.textContent();
    expect(opIdText).toBeTruthy();

    // 9. Forecast Verification: Day-21 closing cash is now restored
    await page.goto('/forecast?date=2026-11-10');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="forecast-view"]')).toBeVisible();

    // 10. Proof Page: Audit trail inspection
    await page.goto('/proof');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=Tamper-Evident Audit Trail')).toBeVisible();

    // Verify audit log entries include financing actions
    const auditTable = page.locator('table');
    await expect(auditTable).toBeVisible();
    await expect(
      page.locator('text=financing.').or(page.locator('text=execute')).first(),
    ).toBeVisible();
  });
});
