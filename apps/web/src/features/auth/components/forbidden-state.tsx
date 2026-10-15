import * as React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export interface ForbiddenStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
}

/**
 * Standard forbidden / access-denied state displayed when an API or route rejects access (403).
 */
export function ForbiddenState({
  title = 'Access Restricted',
  message = 'Your current role does not have permission to view or manage this financial resource.',
  actionText = 'Return to Dashboard',
  actionHref = '/dashboard',
}: ForbiddenStateProps) {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-6">
      <Card className="w-full max-w-md border-border/80 text-center shadow-md">
        <CardHeader className="space-y-2 pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{message}</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <p className="text-[11px] text-muted-foreground/80 font-mono">
            Contact your organization Owner if you believe you require elevated permissions.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/60 p-4">
          <Button asChild variant="outline" size="sm">
            <Link href={actionHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {actionText}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
