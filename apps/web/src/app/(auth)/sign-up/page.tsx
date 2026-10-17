import * as React from 'react';
import type { Metadata } from 'next';
import { SignUpForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Sign Up — HarborCFO',
  description: 'Create an account to start using HarborCFO.',
};

export default function SignUpPage() {
  return (
    <React.Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse bg-muted/20 rounded-xl" />}>
      <SignUpForm />
    </React.Suspense>
  );
}
