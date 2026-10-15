import type { Metadata } from 'next';
import { SignInForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Sign In — HarborCFO',
  description: 'Sign in to access your SME finance copilot.',
};

export default function SignInPage() {
  return <SignInForm />;
}
