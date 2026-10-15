import { DashboardView } from '@/features/dashboard';

export const metadata = {
  title: 'Dashboard | HarborCFO',
  description: 'Deterministic cash runway, risk alerts, and liquidity exposure',
};

export default function DashboardPage() {
  return <DashboardView />;
}
