'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface SignOutButtonProps extends ButtonProps {
  showIcon?: boolean;
}

export function SignOutButton({
  children = 'Sign out',
  showIcon = true,
  className,
  variant = 'ghost',
  ...props
}: SignOutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      router.push('/sign-in');
      router.refresh();
    } catch {
      // Fallback redirect on error
      router.push('/sign-in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleSignOut}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        showIcon && <LogOut className="mr-2 h-4 w-4" />
      )}
      {children}
    </Button>
  );
}
