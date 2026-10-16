'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveCompany } from '@/features/tenants';
import { usePermission } from '@/features/auth';
import { useTenantSettings } from '../api/use-tenant-settings';
import { CompanySettingsForm } from './company-settings-form';
import { BusinessProfileForm } from './business-profile-form';
import { CommitmentsTable } from './commitments-table';
import { TeamTable } from '@/features/team';
import { Building2, CalendarDays, Users } from 'lucide-react';

export function SettingsTabs() {
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
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load settings: {error?.message || 'Unable to retrieve workspace configuration'}
      </div>
    );
  }

  return (
    <Tabs defaultValue="company" className="space-y-6">
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
