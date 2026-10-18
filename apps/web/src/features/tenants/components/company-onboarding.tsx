'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';
import { useActiveCompany } from '../hooks/use-active-company';
import { CreateCompanyForm } from './create-company-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CompanyOnboarding() {
  const router = useRouter();
  const { companies, setActiveCompany, role } = useActiveCompany();
  const [selecting, setSelecting] = React.useState(false);

  const handleSelect = async (orgId: string) => {
    setSelecting(true);
    try {
      await setActiveCompany(orgId);
      router.push('/dashboard');
      router.refresh();
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 space-y-6">
      <div className="text-center max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Let&apos;s Get You Set Up 🏢</h1>
        <p className="text-muted-foreground mt-2">Choose an existing workspace or create a new one for your business.</p>
      </div>

      {companies.length > 0 && (
        <Card className="w-full max-w-lg shadow-md border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Welcome Back! Choose Your Company</CardTitle>
            <CardDescription>
              You belong to these business workspaces. Pick one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{company.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{company.slug}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selecting}
                  onClick={() => handleSelect(company.id)}
                >
                  Open
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {role !== 'employee' ? (
        <CreateCompanyForm />
      ) : (
        companies.length === 0 && (
          <div className="text-center text-sm text-muted-foreground p-4 bg-muted/40 rounded-lg">
            You are signed in as an Employee. Please ask your company owner to add you to their company workspace.
          </div>
        )
      )}
    </div>
  );
}
