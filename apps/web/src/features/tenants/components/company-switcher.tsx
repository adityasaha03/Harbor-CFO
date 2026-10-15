'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useActiveCompany } from '../hooks/use-active-company';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CompanySwitcher() {
  const router = useRouter();
  const { activeCompany, companies, role, isLoading, setActiveCompany } = useActiveCompany();
  const [switching, setSwitching] = React.useState(false);

  const handleSelectCompany = async (companyId: string) => {
    if (activeCompany?.id === companyId) return;
    setSwitching(true);
    try {
      await setActiveCompany(companyId);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  };

  if (isLoading && !activeCompany) {
    return (
      <div className="h-12 w-full animate-pulse rounded-lg bg-sidebar-accent/50 p-2" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-auto py-2.5 px-3 bg-sidebar border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground shadow-sm"
          disabled={switching}
          aria-label="Select company workspace"
        >
          <div className="flex items-center gap-2.5 text-left truncate">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold truncate leading-tight">
                {activeCompany?.name || 'Select Company'}
              </span>
              <span className="text-[10px] text-muted-foreground truncate font-mono">
                {activeCompany?.slug || 'No workspace active'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {role && (
              <Badge
                variant="secondary"
                className="text-[9px] uppercase font-mono px-1 py-0 h-4 bg-muted/80"
              >
                {role}
              </Badge>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Company Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {companies.map((company) => {
            const isActive = company.id === activeCompany?.id;
            return (
              <DropdownMenuItem
                key={company.id}
                className="flex items-center justify-between cursor-pointer py-2 text-xs"
                onClick={() => handleSelectCompany(company.id)}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">{company.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                      {company.slug}
                    </span>
                  </div>
                </div>
                {isActive && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/company" className="flex items-center cursor-pointer text-xs font-medium text-primary">
            <PlusCircle className="mr-2 h-3.5 w-3.5" />
            <span>Create new company</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
