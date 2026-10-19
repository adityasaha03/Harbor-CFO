'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Compass, Loader2, AlertTriangle, Users, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { authClient } from '../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { isValidProtectedRoute } from '../lib/protected-routes';
import { cn } from '@/lib/utils';

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');

  const [accountType, setAccountType] = React.useState<'owner' | 'employee'>('owner');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [alreadyRegisteredEmail, setAlreadyRegisteredEmail] = React.useState<string | null>(null);
  const [isEmployeeNotice, setIsEmployeeNotice] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

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
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignUpValues) => {
    setFormError(null);
    setAlreadyRegisteredEmail(null);
    setIsEmployeeNotice(false);
    setIsLoading(true);

    const email = values.email.trim().toLowerCase();

    // 1. Preflight check: Verify if email is already registered or invited as an employee
    try {
      const checkRes = await fetch(`/api/team/check-email?email=${encodeURIComponent(email)}`);
      if (checkRes.ok) {
        const checkData = (await checkRes.json()) as { exists?: boolean; isEmployee?: boolean };
        if (checkData.exists) {
          const isEmp = !!checkData.isEmployee;
          setIsEmployeeNotice(isEmp);
          setAlreadyRegisteredEmail(email);
          const err = isEmp
            ? 'This email is already registered as an employee by your company owner. User already exists. You cannot sign up again — please sign in instead.'
            : 'This email is already registered. User already exists. You cannot sign up again — please sign in instead.';
          setFormError(err);
          toast.error('This email is already registered. You cannot sign up again. Please sign in instead.');
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Continue to BetterAuth signUp if check-email is temporarily unavailable
    }

    // 2. Attempt BetterAuth account registration
    try {
      const { data, error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (error || !data) {
        const errorMsg = error?.message || 'Unable to create account. Please try again.';
        const isAlreadyExists =
          errorMsg.toLowerCase().includes('already exists') ||
          errorMsg.toLowerCase().includes('user exists') ||
          error?.status === 400 ||
          error?.status === 422;

        if (isAlreadyExists) {
          setAlreadyRegisteredEmail(email);
          const blockMsg =
            'This email is already registered. User already exists. You cannot sign up again — please sign in instead.';
          setFormError(blockMsg);
          toast.error('This email is already registered. You cannot sign up again. Please sign in instead.');
          setIsLoading(false);
          return;
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

  const signInUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (alreadyRegisteredEmail) {
      params.set('email', alreadyRegisteredEmail);
    }
    if (rawCallbackUrl) {
      params.set('callbackUrl', rawCallbackUrl);
    }
    const query = params.toString();
    return query ? `/sign-in?${query}` : '/sign-in';
  }, [alreadyRegisteredEmail, rawCallbackUrl]);

  return (
    <Card className="w-full max-w-md shadow-lg border-border/80">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Compass className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Start Your Journey 🚀</CardTitle>
        <CardDescription>
          {accountType === 'employee'
            ? 'Employee accounts are set up by company owners.'
            : 'Create your free account and take control of your business finances.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setAccountType('owner');
              setFormError(null);
            }}
            className={cn(
              'py-1.5 px-3 rounded-md font-medium transition-colors',
              accountType === 'owner'
                ? 'bg-background shadow-xs text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Company Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setAccountType('employee');
              setFormError(null);
            }}
            className={cn(
              'py-1.5 px-3 rounded-md font-medium transition-colors',
              accountType === 'employee'
                ? 'bg-background shadow-xs text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Employee
          </button>
        </div>

        {accountType === 'employee' ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Users className="h-4 w-4 text-primary shrink-0" />
                Employees do not need to sign up
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your company owner adds your employee account directly in HarborCFO. You cannot create a separate
                account or sign up again here.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please sign in with the credentials configured by your company owner.
              </p>
            </div>

            <Button asChild className="w-full">
              <Link href={rawCallbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(rawCallbackUrl)}` : '/sign-in'}>
                Go to Sign In →
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-muted bg-muted/30 p-2.5 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Invited as an employee?</strong> You do not need to sign up. Employees must log in directly with their pre-configured credentials.
            </div>

            {alreadyRegisteredEmail && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-destructive">
                      {isEmployeeNotice ? 'Employee account already registered' : 'Account already registered'}
                    </p>
                    <p className="text-muted-foreground">
                      {isEmployeeNotice
                        ? 'This email is already registered as an employee by your company owner. User already exists. You cannot sign up again. Please sign in instead.'
                        : 'This email is already registered. User already exists. You cannot sign up again with this email. Please sign in instead.'}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" className="w-full">
                  <Link href={signInUrl}>
                    Sign In with {alreadyRegisteredEmail}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}

            {formError && !alreadyRegisteredEmail && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Alice Zhang"
                  autoComplete="name"
                  disabled={isLoading}
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alice@company.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...register('password')}
                    aria-invalid={!!errors.password}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...register('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account — It’s Free
              </Button>
            </form>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/60 p-4">
        <p className="text-xs text-muted-foreground">
          Already a member?{' '}
          <Link
            href={rawCallbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(rawCallbackUrl)}` : '/sign-in'}
            className="font-semibold text-primary hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
