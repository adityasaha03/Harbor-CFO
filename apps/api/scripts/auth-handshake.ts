import { DEMO_EMAILS, DEMO_TENANTS } from '@harbor/contracts';

export interface HandshakeScenarioResult {
  scenario: string;
  target: string;
  expectedStatus: number;
  actualStatus: number;
  expectedRole?: string;
  actualRole?: string;
  passed: boolean;
  notes?: string;
}

export interface HandshakeRunOptions {
  webUrl?: string;
  apiUrl?: string;
  password?: string;
}

interface SignInSession {
  token: string;
  cookie: string;
  activeOrgId?: string;
}

/**
 * Signs in via Better Auth on the web app and obtains a signed JWT via /api/auth/token.
 */
async function signInAndGetSession(
  webUrl: string,
  email: string,
  password: string,
): Promise<SignInSession> {
  const signInRes = await fetch(`${webUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!signInRes.ok) {
    const errBody = await signInRes.text();
    throw new Error(`Failed to sign in as ${email} (${signInRes.status}): ${errBody}`);
  }

  // Handle cookies across node fetch implementations
  const cookieHeaders = typeof signInRes.headers.getSetCookie === 'function'
    ? signInRes.headers.getSetCookie().join('; ')
    : signInRes.headers.get('set-cookie') ?? '';

  const tokenRes = await fetch(`${webUrl}/api/auth/token`, {
    method: 'GET',
    headers: { cookie: cookieHeaders },
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    throw new Error(`Failed to obtain JWT token for ${email} (${tokenRes.status}): ${errBody}`);
  }

  const tokenData = (await tokenRes.json()) as { token: string };

  // Resolve active or primary organization id for tenant context
  let activeOrgId: string | undefined;
  const orgListRes = await fetch(`${webUrl}/api/auth/organization/list`, {
    headers: { cookie: cookieHeaders },
  });

  if (orgListRes.ok) {
    const orgs = (await orgListRes.json()) as { id: string; slug: string }[];
    if (Array.isArray(orgs) && orgs.length > 0) {
      activeOrgId = orgs[0]?.id;
    }
  }

  return {
    token: tokenData.token,
    cookie: cookieHeaders,
    activeOrgId,
  };
}

/**
 * Runs all 7 authentication and tenant boundary scenarios across web Better Auth and the Express API.
 */
export async function runAuthHandshake(
  options?: HandshakeRunOptions,
): Promise<HandshakeScenarioResult[]> {
  const webUrl = (options?.webUrl ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const apiUrl = (options?.apiUrl ?? process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const password = options?.password ?? process.env.DEMO_PASSWORD ?? 'Password123!';

  const results: HandshakeScenarioResult[] = [];

  // Helper to query Express GET /api/v1/me
  async function callMe(token?: string, tenantId?: string) {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }

    const res = await fetch(`${apiUrl}/api/v1/me`, { headers });
    let body: Record<string, unknown> | null = null;
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // Empty or non-JSON body
    }
    return { status: res.status, body };
  }

  // 1. Authenticate demo accounts
  const ownerSession = await signInAndGetSession(webUrl, DEMO_EMAILS.HARBOR_OWNER, password);
  const employeeSession = await signInAndGetSession(webUrl, DEMO_EMAILS.HARBOR_EMPLOYEE, password);
  const reviewerSession = await signInAndGetSession(webUrl, DEMO_EMAILS.HARBOR_REVIEWER, password);
  const pearlOwnerSession = await signInAndGetSession(webUrl, DEMO_EMAILS.PEARL_OWNER, password);

  // Harbor tenant id (resolved from owner session or fallback slug)
  const harborTenantId = ownerSession.activeOrgId ?? DEMO_TENANTS.HARBOR_WHOLESALE;

  // Scenario 1: Harbor Owner
  const s1 = await callMe(ownerSession.token, harborTenantId);
  const s1Role = (s1.body?.data as Record<string, unknown> | undefined)?.role;
  results.push({
    scenario: '1. Harbor Owner access',
    target: 'GET /api/v1/me',
    expectedStatus: 200,
    actualStatus: s1.status,
    expectedRole: 'owner',
    actualRole: typeof s1Role === 'string' ? s1Role : undefined,
    passed: s1.status === 200 && s1Role === 'owner',
  });

  // Scenario 2: Harbor Employee
  const s2 = await callMe(employeeSession.token, harborTenantId);
  const s2Role = (s2.body?.data as Record<string, unknown> | undefined)?.role;
  results.push({
    scenario: '2. Harbor Employee access',
    target: 'GET /api/v1/me',
    expectedStatus: 200,
    actualStatus: s2.status,
    expectedRole: 'employee',
    actualRole: typeof s2Role === 'string' ? s2Role : undefined,
    passed: s2.status === 200 && s2Role === 'employee',
  });

  // Scenario 3: Harbor Reviewer
  const s3 = await callMe(reviewerSession.token, harborTenantId);
  const s3Role = (s3.body?.data as Record<string, unknown> | undefined)?.role;
  results.push({
    scenario: '3. Harbor Reviewer access',
    target: 'GET /api/v1/me',
    expectedStatus: 200,
    actualStatus: s3.status,
    expectedRole: 'reviewer',
    actualRole: typeof s3Role === 'string' ? s3Role : undefined,
    passed: s3.status === 200 && s3Role === 'reviewer',
  });

  // Scenario 4: Cross-tenant isolation (Pearl Owner sending Harbor tenant id -> 403)
  const s4 = await callMe(pearlOwnerSession.token, harborTenantId);
  results.push({
    scenario: '4. Cross-tenant isolation (Pearl Owner on Harbor tenant)',
    target: 'GET /api/v1/me',
    expectedStatus: 403,
    actualStatus: s4.status,
    passed: s4.status === 403,
    notes: 'Access denied: not a member of Harbor Wholesale',
  });

  // Scenario 5: Missing Authorization token -> 401
  const s5 = await callMe(undefined, harborTenantId);
  results.push({
    scenario: '5. Missing Authorization token',
    target: 'GET /api/v1/me',
    expectedStatus: 401,
    actualStatus: s5.status,
    passed: s5.status === 401,
  });

  // Scenario 6: Malformed token -> 401
  const s6 = await callMe('malformed.jwt.payload.here', harborTenantId);
  results.push({
    scenario: '6. Malformed Authorization token',
    target: 'GET /api/v1/me',
    expectedStatus: 401,
    actualStatus: s6.status,
    passed: s6.status === 401,
  });

  // Scenario 7: Missing X-Tenant-Id header -> 403 (or 400 per B03)
  const s7 = await callMe(ownerSession.token, undefined);
  results.push({
    scenario: '7. Missing X-Tenant-Id header',
    target: 'GET /api/v1/me',
    expectedStatus: 403,
    actualStatus: s7.status,
    passed: s7.status === 403 || s7.status === 400,
    notes: 'Blocked by tenantContext middleware',
  });

  return results;
}

// CLI runner
async function runCli(): Promise<void> {
  const isDirectRun =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('scripts/auth-handshake.ts');

  if (!isDirectRun) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log('Initiating Harbor Auth Handshake (Web Better Auth <-> Express API)...\n');

  try {
    const results = await runAuthHandshake();
    // eslint-disable-next-line no-console
    console.table(
      results.map((r) => ({
        Scenario: r.scenario,
        Target: r.target,
        'Expected Status': r.expectedStatus,
        'Actual Status': r.actualStatus,
        'Role Match': r.expectedRole ? `${r.actualRole ?? 'none'} (${r.expectedRole})` : 'N/A',
        Status: r.passed ? 'PASS' : 'FAIL',
      })),
    );

    const allPassed = results.every((r) => r.passed);
    if (!allPassed) {
      // eslint-disable-next-line no-console
      console.error('\n[Auth Handshake] Some scenarios failed.');
      process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log('\n[Auth Handshake] All 7 scenarios passed successfully!');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('\n[Auth Handshake] Handshake error:', err);
    process.exit(1);
  }
}

void runCli();
