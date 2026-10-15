import * as React from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { requireServerSession } from '@/features/auth';
import { EventStreamListener } from '@/features/events';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireServerSession();

  // If user is authenticated but hasn't activated or joined a company workspace
  if (!session.session.activeOrganizationId) {
    redirect('/company');
  }

  return (
    <AppShell>
      <EventStreamListener />
      {children}
    </AppShell>
  );
}
