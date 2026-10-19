import * as React from 'react';
import { requireServerSession } from '@/features/auth/server';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireServerSession();
  return <>{children}</>;
}
