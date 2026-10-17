import * as React from 'react';
import type { Metadata } from 'next';
import { SignInForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Sign In — HarborCFO',
  description: 'Sign in to access your SME finance copilot.',
};

export default function SignInPage() {
  return (
    <React.Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-muted/20 rounded-xl" />}>
      <SignInForm />
    </React.Suspense>
  );
}
