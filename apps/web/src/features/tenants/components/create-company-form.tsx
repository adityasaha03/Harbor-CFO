'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { authClient } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
});

export type CreateCompanyValues = z.infer<typeof createCompanySchema>;

export function CreateCompanyForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateCompanyValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  // Auto-generate slug while typing if slug hasn't been manually edited
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val, { shouldValidate: true });
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setValue('slug', generatedSlug, { shouldValidate: false });
  };

  const onSubmit = async (values: CreateCompanyValues) => {
    setFormError(null);
    setIsLoading(true);

    try {
      const { data, error } = await authClient.organization.create({
        name: values.name,
        slug: values.slug,
      });

      if (error || !data) {
        setFormError(error?.message || 'Failed to create company. Please try another slug.');
        setIsLoading(false);
        return;
      }

      // Automatically set the new company as active
      await authClient.organization.setActive({
        organizationId: data.id,
      });

      router.push('/dashboard');
      router.refresh();
    } catch {
      setFormError('An unexpected error occurred while creating your company workspace.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg border-border/80">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Register Company Workspace</CardTitle>
            <CardDescription>
              Create your business entity to begin financial modeling and cash management
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {formError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Legal or Trade Name</Label>
            <Input
              id="company-name"
              placeholder="e.g. Harbor Wholesale LLC"
              disabled={isLoading}
              {...register('name')}
              onChange={handleNameChange}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-slug">Workspace Identifier (Slug)</Label>
            <Input
              id="company-slug"
              placeholder="e.g. harbor-wholesale"
              disabled={isLoading}
              {...register('slug')}
              aria-invalid={!!errors.slug}
            />
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Unique URL-safe company identifier used for multi-tenant isolation.
            </p>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Company Workspace
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
