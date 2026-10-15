import { describe, it, expect, vi } from 'vitest';
import { getServerSession, requireServerSession } from '../server/session';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockRejectedValue(new Error('Outside request context')),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('session helpers', () => {
  it('getServerSession returns null when headers are unavailable or outside request context', async () => {
    const session = await getServerSession();
    expect(session).toBeNull();
  });

  it('requireServerSession redirects to /sign-in when unauthenticated', async () => {
    const { redirect } = await import('next/navigation');
    await requireServerSession();
    expect(redirect).toHaveBeenCalledWith('/sign-in');
  });
});
