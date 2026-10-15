import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  formatMinor,
  toMinor,
  addDays,
  ROLE_PERMISSIONS,
  type Role,
} from '@harbor/contracts';

// Simulated Client Component importing contracts
function ClientContractsComponent({ minor }: { minor: number }) {
  const formatted = formatMinor(minor);
  const nextDate = addDays('2026-10-20', 21);
  return (
    <div>
      <span data-testid="client-money">{formatted}</span>
      <span data-testid="client-date">{nextDate}</span>
    </div>
  );
}

// Simulated Server Component importing contracts
function ServerContractsComponent({ role }: { role: Role }) {
  const permissions = ROLE_PERMISSIONS[role];
  const canApprove = permissions.includes('actions:approve');
  return (
    <div>
      <span data-testid="server-role">{role}</span>
      <span data-testid="server-can-approve">{canApprove ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('@harbor/contracts integration', () => {
  it('works correctly in a client component', () => {
    render(<ClientContractsComponent minor={toMinor('12500.00')} />);
    expect(screen.getByTestId('client-money').textContent).toContain('12,500.00');
    expect(screen.getByTestId('client-date').textContent).toBe('2026-11-10');
  });

  it('works correctly in a server component', () => {
    const { rerender } = render(<ServerContractsComponent role="owner" />);
    expect(screen.getByTestId('server-role').textContent).toBe('owner');
    expect(screen.getByTestId('server-can-approve').textContent).toBe('yes');

    rerender(<ServerContractsComponent role="employee" />);
    expect(screen.getByTestId('server-role').textContent).toBe('employee');
    expect(screen.getByTestId('server-can-approve').textContent).toBe('no');
  });
});
