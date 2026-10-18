'use client';

import * as React from 'react';
import { ShieldCheck, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMe, useSession } from '@/features/auth';
import { useActiveCompany } from '@/features/tenants';
import { ROLE_PERMISSIONS, type Role } from '@harbor/contracts';

const ROLE_META: Record<
  Role,
  { label: string; badgeVariant: 'default' | 'secondary' | 'outline'; description: string }
> = {
  owner: {
    label: 'Owner',
    badgeVariant: 'default',
    description:
      'Full administrative control: financial reads, data imports, scenario deltas, AI copilot, proposal creation, final approval & execution, audit logs, and settings.',
  },
  employee: {
    label: 'Employee',
    badgeVariant: 'secondary',
    description:
      'Operational access: financial reads, data imports, scenario exploration, AI copilot, and draft action proposal creation. Execution is strictly blocked (403 Forbidden).',
  },
  reviewer: {
    label: 'Reviewer',
    badgeVariant: 'outline',
    description:
      'Read-only oversight: read access to forecast baselines, alerts, analytics, and offers. Cannot import data, write scenarios, use copilot, or approve actions.',
  },
};

export function CurrentRoleCard(): React.JSX.Element {
  const { data: me, isLoading } = useMe();
  const { user, activeCompanyId } = useSession();
  const { activeCompany } = useActiveCompany();

  const activeRole: Role = me?.role ?? 'employee';
  const roleInfo = ROLE_META[activeRole] ?? ROLE_META.employee;
  const grantedCount = me?.permissions?.length ?? ROLE_PERMISSIONS[activeRole]?.length ?? 0;
  const totalCount = 8;

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight">Active Security Context</CardTitle>
              <Badge variant={roleInfo.badgeVariant} className="px-2.5 py-0.5 font-semibold uppercase tracking-wider">
                {roleInfo.label}
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Current authenticated session and server-verified authorization tier.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Cryptographically Verified</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/50 p-3">
            <UserCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Authenticated Actor</p>
              <p className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[180px]">
                {user?.name || user?.email || me?.userId || 'Demo User'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/50 p-3">
            <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Tenant Organization</p>
              <p className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[180px]">
                {activeCompany?.name || 'Organization'}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">
                {me?.tenantId || activeCompanyId || activeCompany?.id || 'Active Tenant'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/50 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Effective Permissions</p>
              <p className="text-sm font-semibold text-foreground">
                {isLoading ? 'Loading...' : `${grantedCount} of ${totalCount} Capabilities`}
              </p>
              <p className="text-[11px] text-muted-foreground">Enforced via Express Bearer JWT</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1">
              <p className="font-semibold">Security Invariant: Express API Authority</p>
              <p className="leading-relaxed opacity-90">
                The Express backend is the exclusive source of truth for authorization. Hiding UI buttons is convenience;
                every backend query enforces tenant boundaries and member roles from verified JWT claims.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
