'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building2, Settings, Shield } from 'lucide-react';
import { useSession } from '../hooks/use-session';
import { SignOutButton } from './sign-out-button';
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

export function UserMenu() {
  const { user, role, isPending } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  if (isPending) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!user) {
    return (
      <Link href="/sign-in">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </Link>
    );
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!isSigningOut) {
          setIsOpen(nextOpen);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
          aria-label="User account menu"
        >
          <span className="text-xs font-semibold">{initials}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold leading-none">{user.name}</p>
              {role && (
                <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                  {role}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/company" className="flex items-center cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              <span>Switch Company</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/proof" className="flex items-center cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              <span>Security Proof</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          onSelect={(event) => {
            // Prevent dropdown from instantly vanishing so the user clearly sees the loader
            event.preventDefault();
          }}
          disabled={isSigningOut}
        >
          <SignOutButton
            onSignOutStart={() => setIsSigningOut(true)}
            variant="ghost"
            className="w-full justify-start text-xs font-normal text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
