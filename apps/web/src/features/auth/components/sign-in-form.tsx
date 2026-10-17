'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Compass, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { DemoAccountPicker } from './demo-account-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { isValidProtectedRoute } from '../lib/protected-routes';

const signInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const callbackUrl = rawCallbackUrl || '/dashboard';

  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (rawCallbackUrl && isValidProtectedRoute(rawCallbackUrl)) {
      toast.error('You need to sign up to visit the page', { id: 'auth-required' });
    }
  }, [rawCallbackUrl]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: SignInValues) => {
    setFormError(null);
    setIsLoading(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error || !data) {
        setFormError('Invalid email or password. Please try again.');
        toast.error('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      toast.success('Signed in successfully! Welcome back.');

      // Check whether an active company is assigned to the session
      const sessionRes = await authClient.getSession();
      const activeOrgId = (
        sessionRes?.data?.session as { activeOrganizationId?: string | null } | undefined
      )?.activeOrganizationId;

      if (activeOrgId) {
        router.push(callbackUrl);
      } else {
        router.push('/company');
      }
      router.refresh();
    } catch {
      setFormError('An unexpected error occurred during sign in. Please try again.');
      toast.error('An unexpected error occurred during sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/80">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Compass className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Sign in to HarborCFO</CardTitle>
        <CardDescription>
          Enter your credentials to access your finance copilot workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              disabled={isLoading}
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>

        <DemoAccountPicker onSelectEmail={(email) => setValue('email', email, { shouldValidate: true })} />
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/60 p-4">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={rawCallbackUrl ? `/sign-up?callbackUrl=${encodeURIComponent(rawCallbackUrl)}` : '/sign-up'}
            className="font-semibold text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
