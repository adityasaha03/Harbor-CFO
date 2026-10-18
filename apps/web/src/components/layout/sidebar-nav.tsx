'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle,
  Landmark,
  GitBranch,
  ShieldCheck,
  Bot,
  FileCheck2,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/features/auth';
import { hasPermission, type Permission } from '@harbor/contracts';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Your financial overview',
    icon: LayoutDashboard,
    permission: 'finance:read',
  },
  {
    href: '/imports',
    label: 'Imports',
    description: 'Upload bank & invoice data',
    icon: FileSpreadsheet,
    permission: 'imports:write',
  },
  {
    href: '/forecast',
    label: 'Forecast',
    description: 'Future cash projections',
    icon: TrendingUp,
    permission: 'finance:read',
  },
  {
    href: '/alerts',
    label: 'Alerts',
    description: 'Issues needing attention',
    icon: AlertTriangle,
    permission: 'finance:read',
  },
  {
    href: '/financing',
    label: 'Financing',
    description: 'Borrowing options',
    icon: Landmark,
    permission: 'finance:read',
  },
  {
    href: '/scenarios',
    label: 'Scenarios',
    description: 'What-if analysis',
    icon: GitBranch,
    permission: 'scenarios:write',
  },
  {
    href: '/actions',
    label: 'Actions',
    description: 'Approve decisions',
    icon: ShieldCheck,
    permission: 'actions:propose',
  },
  {
    href: '/agent',
    label: 'Agent',
    description: 'AI finance assistant',
    icon: Bot,
    permission: 'agent:use',
  },
  {
    href: '/proof',
    label: 'Proof & Audit',
    description: 'Verified records',
    icon: FileCheck2,
    permission: 'audit:export',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Preferences & team',
    icon: Settings,
    permission: 'settings:manage',
  },
];

export interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: NavItem[];
  onItemClick?: () => void;
}

export function SidebarNav({
  items = NAV_ITEMS,
  onItemClick,
  className,
  ...props
}: SidebarNavProps) {
  const pathname = usePathname();
  const { role } = useSession();

  const filteredItems = React.useMemo(() => {
    if (!role) return items;
    return items.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(role, item.permission);
    });
  }, [items, role]);

  return (
    <nav className={cn('flex flex-col gap-1', className)} {...props}>
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'group flex items-start gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 mt-0.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            <div className="min-w-0">
              <span className="truncate block">{item.label}</span>
              <span className="truncate block text-[10px] font-normal text-muted-foreground/70">{item.description}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
