import { getApiToken } from '@/features/auth';
import { getActiveTenantId } from '@/lib/api/client';

/**
 * Downloads the server-generated CSV error report for a rejected or partially-failed import.
 */
export async function downloadErrorReport(importId: string, fileName?: string): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const url = `${baseUrl}/api/v1/imports/${encodeURIComponent(importId)}/errors.csv`;

  const headers: Record<string, string> = {};
  const token = await getApiToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const tenantId = getActiveTenantId();
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download error report: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const baseName = fileName ? fileName.replace(/\.csv$/i, '') : `import-${importId}`;
  a.download = `${baseName}-errors.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
