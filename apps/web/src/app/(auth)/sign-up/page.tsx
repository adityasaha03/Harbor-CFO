import type { Metadata } from 'next';
import { SignUpForm } from '@/features/auth';

export const metadata: Metadata = {
  title: 'Sign Up — HarborCFO',
  description: 'Create an account to start using HarborCFO.',
};

export default function SignUpPage() {
  return <SignUpForm />;
}
