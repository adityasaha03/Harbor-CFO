'use client';

import * as React from 'react';
import { Check, X, Shield, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMe } from '@/features/auth';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from '@harbor/contracts';

const PERMISSION_DESCRIPTIONS: Record<Permission, { label: string; detail: string }> = {
  'finance:read': {
    label: 'Read Financial Data',
    detail: 'View baseline forecasts, accounts, alerts, analytics metrics, and financing catalog',
  },
  'imports:write': {
    label: 'Import Bank & ERP Data',
    detail: 'Upload transactions and invoices CSVs, preview parsed rows, and commit dataset bumps',
  },
  'scenarios:write': {
    label: 'Run What-If Scenarios',
    detail: 'Create scenario explorations, evaluate cash-flow deltas, and compare against baseline',
  },
  'agent:use': {
    label: 'AI Copilot Sessions',
    detail: 'Trigger autonomous financial copilot reasoning runs and stream telemetry tools',
  },
  'actions:propose': {
    label: 'Propose Financial Actions',
    detail: 'Draft structured financing draws or early collection actions for management review',
  },
  'actions:approve': {
    label: 'Approve & Execute Actions',
    detail: 'Cryptographically approve proposals and execute idempotent money sandbox mutations',
  },
  'audit:export': {
    label: 'Export Audit Logs & Evidence',
    detail: 'Query tamper-evident audit logs and export cryptographically verified evidence bundles',
  },
  'settings:manage': {
    label: 'Manage Tenant Settings',
    detail: 'Configure cash floor, alert thresholds, profile data, and reset demo datasets',
  },
};

const ROLES: Role[] = ['owner', 'employee', 'reviewer'];

export function PermissionMatrix(): React.JSX.Element {
  const { data: me } = useMe();
  const activeRole: Role = me?.role ?? 'employee';

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Shield className="h-5 w-5 text-primary" />
              <span>Role-Based Access Control (RBAC) Matrix</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Authoritative capabilities enforced by backend JWT verification and database membership lookups.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Active role highlighted</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/60">
                <TableHead className="w-[320px] py-3.5 font-semibold text-foreground">
                  Capability / Permission
                </TableHead>
                {ROLES.map((role) => {
                  const isActive = role === activeRole;
                  return (
                    <TableHead
                      key={role}
                      className={`text-center font-semibold capitalize transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary border-x border-primary/20'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center py-1">
                        <span className="text-sm">{role}</span>
                        {isActive && (
                          <Badge variant="default" className="mt-1 h-4 px-1.5 text-[10px] uppercase">
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {PERMISSIONS.map((permission, idx) => {
                const info = PERMISSION_DESCRIPTIONS[permission];
                return (
                  <TableRow
                    key={permission}
                    className={`border-b border-border/40 hover:bg-muted/20 ${
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                    }`}
                  >
                    <TableCell className="py-3 font-medium">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{info.label}</p>
                        <p className="text-xs text-muted-foreground">{info.detail}</p>
                        <p className="font-mono text-[11px] text-muted-foreground/80">{permission}</p>
                      </div>
                    </TableCell>

                    {ROLES.map((role) => {
                      const allowed = ROLE_PERMISSIONS[role].includes(permission);
                      const isActive = role === activeRole;

                      return (
                        <TableCell
                          key={`${permission}-${role}`}
                          className={`text-center ${
                            isActive ? 'bg-primary/5 border-x border-primary/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {allowed ? (
                              <div
                                aria-label={`${role} has ${permission}`}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              >
                                <Check className="h-4 w-4 stroke-[2.5]" />
                              </div>
                            ) : (
                              <div
                                aria-label={`${role} lacks ${permission}`}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/40"
                              >
                                <X className="h-4 w-4 stroke-[2.5]" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
