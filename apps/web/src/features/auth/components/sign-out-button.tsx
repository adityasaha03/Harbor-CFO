'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { clearApiToken } from '../lib/api-token';
import { Button, type ButtonProps } from '@/components/ui/button';
import { toast } from 'sonner';

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
      clearApiToken();
      toast.success('Signed out successfully.');
      router.push('/sign-in');
      router.refresh();
    } catch {
      clearApiToken();
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
