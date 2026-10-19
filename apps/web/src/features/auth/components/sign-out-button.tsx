'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '../lib/auth-client';
import { clearApiToken } from '../lib/api-token';
import { setActiveTenantId } from '@/lib/api/client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { toast } from 'sonner';

export interface SignOutButtonProps extends ButtonProps {
  showIcon?: boolean;
  onSignOutStart?: () => void;
}

export function SignOutButton({
  children = 'Sign out',
  showIcon = true,
  className,
  variant = 'ghost',
  onSignOutStart,
  onClick,
  onSelect,
  ...props
}: SignOutButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignOut = async (e?: React.SyntheticEvent | Event) => {
    if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (isLoading) return;
    setIsLoading(true);
    onSignOutStart?.();

    try {
      // Race signOut to ensure UI never hangs if network has latency or disconnects
      await Promise.race([
        authClient.signOut(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      // Proceed to cleanup and redirect on error
    } finally {
      clearApiToken();
      setActiveTenantId(null);
      queryClient.clear();

      // Explicitly expire session cookies in browser
      if (typeof document !== 'undefined') {
        document.cookie = 'better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
        document.cookie = 'better-auth.session_data=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
        document.cookie = '__Secure-better-auth.session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
      }

      toast.success('Signed out successfully.');
      router.push('/sign-in');
      router.refresh();

      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        window.location.href = '/sign-in';
      }
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        void handleSignOut(e);
      }}
      onSelect={(e: unknown) => {
        if (e && typeof e === 'object' && 'preventDefault' in e && typeof (e as { preventDefault: () => void }).preventDefault === 'function') {
          (e as { preventDefault: () => void }).preventDefault();
        }
        (onSelect as ((e: unknown) => void) | undefined)?.(e);
        void handleSignOut(e as Event);
      }}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-destructive" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          {showIcon && <LogOut className="mr-2 h-4 w-4" />}
          <span>{children}</span>
        </>
      )}
    </Button>
  );
}
