import type { Metadata } from 'next';
import { requireServerSession } from '@/features/auth';
import { CompanyOnboarding } from '@/features/tenants';

export const metadata: Metadata = {
  title: 'Company Workspace — HarborCFO',
  description: 'Select or create your company workspace.',
};

export default async function CompanyPage() {
  await requireServerSession();
  return <CompanyOnboarding />;
}
