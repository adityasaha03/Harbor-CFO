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
  icon: LucideIcon;
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'finance:read',
  },
  {
    href: '/imports',
    label: 'Imports',
    icon: FileSpreadsheet,
    permission: 'imports:write',
  },
  {
    href: '/forecast',
    label: 'Forecast',
    icon: TrendingUp,
    permission: 'finance:read',
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: AlertTriangle,
    permission: 'finance:read',
  },
  {
    href: '/financing',
    label: 'Financing',
    icon: Landmark,
    permission: 'finance:read',
  },
  {
    href: '/scenarios',
    label: 'Scenarios',
    icon: GitBranch,
    permission: 'scenarios:write',
  },
  {
    href: '/actions',
    label: 'Actions',
    icon: ShieldCheck,
    permission: 'actions:propose',
  },
  {
    href: '/agent',
    label: 'Agent',
    icon: Bot,
    permission: 'agent:use',
  },
  {
    href: '/proof',
    label: 'Proof & Audit',
    icon: FileCheck2,
    permission: 'audit:export',
  },
  {
    href: '/settings',
    label: 'Settings',
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
              'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
