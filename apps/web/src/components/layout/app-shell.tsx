'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Compass, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from './sidebar-nav';
import { SyntheticDataBadge } from './synthetic-data-badge';
import { UserMenu } from '@/features/auth';
import { CompanySwitcher } from '@/features/tenants';

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">
              HarborCFO
            </span>
            <span className="text-xs text-muted-foreground">SME Finance Copilot</span>
          </div>
        </div>

        <div className="px-3 pt-3 pb-1 border-b border-sidebar-border/60">
          <CompanySwitcher />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <SidebarNav />
        </div>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sidebar-foreground">
                Demo Workspace
              </span>
              <span className="text-xs text-muted-foreground">Harbor Wholesale</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 md:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center gap-2.5 border-b px-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Compass className="h-5 w-5" />
                  </div>
                  <span className="text-base font-bold text-foreground">
                    HarborCFO
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <CompanySwitcher />
                  <SidebarNav onItemClick={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold text-foreground md:hidden"
            >
              <Compass className="h-5 w-5 text-primary" />
              <span>HarborCFO</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <SyntheticDataBadge />
            <UserMenu />
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
