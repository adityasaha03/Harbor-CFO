'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveCompany } from '@/features/tenants';
import { usePermission } from '@/features/auth';
import { useTenantSettings } from '../api/use-tenant-settings';
import { CompanySettingsForm } from './company-settings-form';
import { BusinessProfileForm } from './business-profile-form';
import { CommitmentsTable } from './commitments-table';
import { TeamTable } from '@/features/team';
import { ForbiddenState } from '@/features/auth';
import { ErrorState } from '@/components/feedback/error-state';
import { ApiError } from '@/lib/api/errors';
import { Building2, CalendarDays, Users } from 'lucide-react';

export function SettingsTabs() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab');
  const initialTab =
    requestedTab && ['company', 'commitments', 'team'].includes(requestedTab)
      ? requestedTab
      : 'company';

  const { role, isLoading: isRoleLoading } = useActiveCompany();
  const canManageSettings = usePermission('settings:manage');
  const { data: settings, isLoading: isSettingsLoading, error } = useTenantSettings();

  const isOwner = role === 'owner' || canManageSettings;
  const isReadOnly = !isOwner;

  if (isSettingsLoading || isRoleLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
        Loading workspace settings...
      </div>
    );
  }

  if (error || !settings) {
    const isForbidden =
      (ApiError.isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) ||
      (error?.message?.toLowerCase().includes('forbidden') ||
        error?.message?.includes('403') ||
        error?.message?.toLowerCase().includes('insufficient permissions'));

    if (isForbidden) {
      return (
        <ForbiddenState
          title="Settings Restricted"
          message={error?.message || 'Your current role does not have permission to view or manage tenant settings.'}
        />
      );
    }

    return (
      <ErrorState
        title="Failed to load workspace settings"
        message={error?.message || 'Unable to retrieve workspace configuration'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Tabs defaultValue={initialTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
        <TabsTrigger value="company" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span>Company</span>
        </TabsTrigger>
        <TabsTrigger value="commitments" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          <span>Commitments</span>
        </TabsTrigger>
        <TabsTrigger value="team" className="gap-2">
          <Users className="h-4 w-4" />
          <span>Team</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="space-y-6">
        <CompanySettingsForm settings={settings} isReadOnly={isReadOnly} />
        <BusinessProfileForm settings={settings} isReadOnly={isReadOnly} />
      </TabsContent>

      <TabsContent value="commitments">
        <CommitmentsTable isReadOnly={isReadOnly} />
      </TabsContent>

      <TabsContent value="team">
        <TeamTable isReadOnly={isReadOnly} />
      </TabsContent>
    </Tabs>
  );
}
