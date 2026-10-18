import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/team/check-email/route';
import { testMemoryDb } from '@/features/auth/server/auth';

describe('/api/team/check-email route handler', () => {
  beforeEach(() => {
    testMemoryDb.user = [];
    testMemoryDb.member = [];
  });

  it('rejects invalid or missing email with 400', async () => {
    const req = new Request('http://localhost:3000/api/team/check-email?email=invalid-email', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.exists).toBe(false);
  });

  it('returns exists: false for unknown email', async () => {
    const req = new Request('http://localhost:3000/api/team/check-email?email=unknown@company.com', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(false);
  });

  it('returns exists: true, isEmployee: true when user is an employee in testMemoryDb', async () => {
    testMemoryDb.user = [
      { id: 'emp_1', email: 'employee@company.com', name: 'Employee Person' },
    ];
    testMemoryDb.member = [
      { id: 'mem_1', userId: 'emp_1', role: 'employee', organizationId: 'org_1' },
    ];

    const req = new Request('http://localhost:3000/api/team/check-email?email=EMPLOYEE@company.com', {
      method: 'GET',
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(true);
    expect(data.isEmployee).toBe(true);
    expect(data.role).toBe('employee');
  });

  it('returns exists: true, isEmployee: false via POST for owner in testMemoryDb', async () => {
    testMemoryDb.user = [
      { id: 'owner_1', email: 'owner@company.com', name: 'Owner Person' },
    ];
    testMemoryDb.member = [
      { id: 'mem_2', userId: 'owner_1', role: 'owner', organizationId: 'org_1' },
    ];

    const req = new Request('http://localhost:3000/api/team/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@company.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exists).toBe(true);
    expect(data.isEmployee).toBe(false);
    expect(data.role).toBe('owner');
  });
});
