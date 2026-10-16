import type { Page } from '@playwright/test';
import { DEMO_EMAILS } from '@harbor/contracts';

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Password123!';

/**
 * Signs in via the UI form, handles workspace selection if needed,
 * and waits until the dashboard is fully loaded.
 */
export async function signIn(page: Page, email: string, password = DEMO_PASSWORD): Promise<void> {
  await page.goto('/sign-in');
  await page.waitForLoadState('domcontentloaded');

  // Fill in credentials
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');

  // Wait for either /company or /dashboard
  await page.waitForURL(
    (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/company'),
    { timeout: 30000 },
  );

  // If on /company selection page, select appropriate workspace
  if (page.url().includes('/company')) {
    const isPearl = email === DEMO_EMAILS.PEARL_OWNER;
    const targetText = isPearl ? 'Pearl Bakery' : 'Harbor Wholesale';
    const companyCard = page
      .locator('div')
      .filter({ hasText: targetText })
      .filter({ has: page.locator('button:has-text("Open")') });
    await companyCard.locator('button:has-text("Open")').first().click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  }

  // Ensure dashboard overview view is mounted
  await page.waitForSelector('[data-testid="dashboard-view"]', { timeout: 30000 });
}

export async function signInAsOwner(page: Page): Promise<void> {
  await signIn(page, DEMO_EMAILS.HARBOR_OWNER);
}

export async function signInAsEmployee(page: Page): Promise<void> {
  await signIn(page, DEMO_EMAILS.HARBOR_EMPLOYEE);
}

export async function signInAsPearlOwner(page: Page): Promise<void> {
  await signIn(page, DEMO_EMAILS.PEARL_OWNER);
}

export interface AuthContext {
  token: string;
  tenantId: string;
}

/**
 * Extracts the API Bearer JWT token and active tenant ID from the authenticated browser session.
 */
export async function getAuthContext(page: Page): Promise<AuthContext> {
  return await page.evaluate(async () => {
    // 1. Fetch JWT token from Better Auth jwt plugin endpoint
    const tokenRes = await fetch('/api/auth/token', { method: 'GET' });
    let token = '';
    if (tokenRes.ok) {
      const data = await tokenRes.json();
      token =
        typeof data === 'string' ? data : data?.token || data?.data?.token || data?.data || '';
    }

    // 2. Fetch active session from Better Auth session endpoint
    const sessionRes = await fetch('/api/auth/get-session', { method: 'GET' });
    let tenantId = '';
    if (sessionRes.ok) {
      const data = await sessionRes.json();
      tenantId =
        data?.session?.activeOrganizationId || data?.data?.session?.activeOrganizationId || '';
    }

    return { token, tenantId };
  });
}
