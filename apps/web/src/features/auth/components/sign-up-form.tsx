'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Compass, Loader2 } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { isValidProtectedRoute } from '../lib/protected-routes';
import { cn } from '@/lib/utils';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');

  const [accountType, setAccountType] = React.useState<'owner' | 'employee'>('owner');
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
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: SignUpValues) => {
    setFormError(null);
    setIsLoading(true);

    try {
      if (accountType === 'employee') {
        const claimRes = await fetch('/api/team/claim-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
        });
        const claimData = (await claimRes.json().catch(() => ({}))) as { message?: string };
        if (!claimRes.ok) {
          const err =
            claimData.message ||
            'This email has not been added to any company team yet. Please ask your company owner to add you first.';
          setFormError(err);
          toast.error(err);
          setIsLoading(false);
          return;
        }
        const signInRes = await authClient.signIn.email({ email: values.email, password: values.password });
        if (signInRes.error) {
          setFormError('Account activated! Please sign in with your credentials.');
          router.push('/sign-in');
          return;
        }
        toast.success('Welcome to the team! Your account is ready to go. 🎉');
        router.push('/dashboard');
        router.refresh();
        return;
      }

      const { data, error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (error || !data) {
        const errorMsg = error?.message || 'Unable to create account. Please try again.';
        if (
          errorMsg.toLowerCase().includes('already exists') ||
          errorMsg.toLowerCase().includes('user exists') ||
          error?.status === 400 ||
          error?.status === 422
        ) {
          try {
            const claimRes = await fetch('/api/team/claim-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
            });
            if (claimRes.ok) {
              const signInRes = await authClient.signIn.email({ email: values.email, password: values.password });
              if (!signInRes.error) {
                toast.success('Welcome to the team! Your account is ready to go. 🎉');
                router.push('/dashboard');
                router.refresh();
                return;
              }
            }
          } catch {
            // Fallback
          }
        }
        setFormError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      toast.success("Welcome aboard! Let's set up your business workspace. 🎉");
      router.push('/company');
      router.refresh();
    } catch {
      setFormError('An unexpected error occurred during account creation.');
      toast.error('An unexpected error occurred during account creation.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-border/80">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Compass className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Start Your Journey 🚀</CardTitle>
        <CardDescription>
          {accountType === 'employee'
            ? 'Activate your employee account. Your owner must add you to the team first.'
            : 'Create your free account and take control of your business finances.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => { setAccountType('owner'); setFormError(null); }}
            className={cn('py-1.5 px-3 rounded-md font-medium transition-colors', accountType === 'owner' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Company Owner
          </button>
          <button
            type="button"
            onClick={() => { setAccountType('employee'); setFormError(null); }}
            className={cn('py-1.5 px-3 rounded-md font-medium transition-colors', accountType === 'employee' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Employee
          </button>
        </div>

        {accountType === 'employee' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Owner invitation required:</strong> Company employees can only sign in or sign up after their owner adds them in Settings &gt; Team.
          </div>
        )}

        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Alice Zhang" autoComplete="name" disabled={isLoading} {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="alice@company.com" autoComplete="email" disabled={isLoading} {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" disabled={isLoading} {...register('password')} aria-invalid={!!errors.password} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {accountType === 'employee' ? 'Activate Employee Account →' : 'Create Account — It’s Free'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/60 p-4">
        <p className="text-xs text-muted-foreground">
          Already a member?{' '}
          <Link href={rawCallbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(rawCallbackUrl)}` : '/sign-in'} className="font-semibold text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
