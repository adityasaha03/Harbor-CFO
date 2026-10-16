import { apiFetch } from '@/lib/api/client';
import type { EvidenceBundle } from '@harbor/contracts';

/**
 * Downloads the complete, verified execution evidence bundle from GET /evidence/export.
 * Formats the response as a JSON file and triggers a browser file download.
 */
export async function downloadEvidenceBundle(): Promise<void> {
  const bundle = await apiFetch<EvidenceBundle>('/evidence/export');

  const jsonString = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `harbor-evidence-bundle-${timestamp}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Clean up DOM and memory
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
