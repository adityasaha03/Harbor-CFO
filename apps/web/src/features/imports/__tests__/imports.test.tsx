import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as authFeature from '@/features/auth';
import * as commitModule from '../api/use-commit-import';
import * as deleteModule from '../api/use-delete-import';
import * as importsListModule from '../api/use-imports';
import * as downloadErrorsModule from '../api/download-error-report';
import { ImportWorkspace } from '../components/import-workspace';
import { FileDropzone } from '../components/file-dropzone';
import { PreviewTable } from '../components/preview-table';
import { ErrorList } from '../components/error-list';
import { CommitBar } from '../components/commit-bar';
import { TemplateLinks } from '../components/template-links';
import { ImportHistoryTable } from '../components/import-history-table';
import type { ImportPreviewResponse, ImportDto } from '@harbor/contracts';

const mockPreviewSuccess: ImportPreviewResponse = {
  importId: 'imp_stage_1',
  kind: 'transactions',
  fileName: 'oct_transactions.csv',
  status: 'previewed',
  rowCount: 2,
  acceptedRows: 2,
  rejectedRows: 0,
  warnings: [{ row: 2, field: 'description', message: 'Description exceeds 500 chars' }],
  errors: [],
  sampleRows: [
    {
      externalId: 'TX-101',
      bookedOn: '2026-10-15',
      accountCode: 'BANK-01',
      category: 'customer_receipt',
      amountMinor: 1500000,
      description: 'Customer deposit invoice #101',
    },
    {
      externalId: 'TX-102',
      bookedOn: '2026-10-16',
      accountCode: 'BANK-02',
      category: 'overhead',
      amountMinor: -450000,
      description: 'Office internet bill',
    },
  ],
};

const mockPreviewRejected: ImportPreviewResponse = {
  importId: 'imp_stage_2',
  kind: 'transactions',
  fileName: 'invalid.csv',
  status: 'rejected',
  rowCount: 3,
  acceptedRows: 0,
  rejectedRows: 3,
  warnings: [],
  errors: [
    { row: 1, field: 'amount', message: 'Amount must be non-zero number' },
    { row: 2, field: 'date', message: 'Invalid ISO date format' },
  ],
  sampleRows: [],
};

const mockHistoryImports: ImportDto[] = [
  {
    id: 'imp_hist_1',
    tenantId: 'tenant_1',
    kind: 'transactions',
    fileName: 'prior_tx.csv',
    checksum: 'hash123',
    mappingVersion: 1,
    status: 'committed',
    rowCount: 50,
    acceptedRows: 50,
    rejectedRows: 0,
    errors: [],
    actorId: 'usr_lead',
    expiresAt: '2026-10-17T00:00:00Z',
    committedAt: '2026-10-16T10:00:00Z',
    createdAt: '2026-10-16T09:50:00Z',
    updatedAt: '2026-10-16T10:00:00Z',
  },
];

describe('F06 Imports Workspace and Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Default permissions: user can write imports
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(true);
    vi.spyOn(authFeature, 'useSession').mockReturnValue({ role: 'owner' } as never);

    // Default history query mock
    vi.spyOn(importsListModule, 'useImports').mockReturnValue({
      data: mockHistoryImports,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as never);
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('validates file extension and size in dropzone', async () => {
    const onPreviewSuccess = vi.fn();
    renderWithClient(<FileDropzone onPreviewSuccess={onPreviewSuccess} />);

    const input = screen.getByTestId('file-input');

    // 1. Non-csv rejection
    const txtFile = new File(['hello'], 'data.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [txtFile] } });
    expect(screen.getByText(/Only \.csv files are supported/i)).toBeInTheDocument();

    // 2. Large file rejection (> 5 MB)
    const largeFile = new File([new Uint8Array(5.5 * 1024 * 1024)], 'huge.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(screen.getByText(/File exceeds 5 MB maximum limit/i)).toBeInTheDocument();
  });

  it('renders preview table with formatted amounts, columns and warnings', () => {
    renderWithClient(<PreviewTable preview={mockPreviewSuccess} />);

    expect(screen.getByText('TX-101')).toBeInTheDocument();
    expect(screen.getByText('BANK-01')).toBeInTheDocument();
    expect(screen.getByText('Customer deposit invoice #101')).toBeInTheDocument();
    expect(screen.getByText('¥15,000.00')).toBeInTheDocument();
    expect(screen.getByText('-¥4,500.00')).toBeInTheDocument();
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
  });

  it('renders atomic rejection notice and error list with download button', async () => {
    const downloadSpy = vi.spyOn(downloadErrorsModule, 'downloadErrorReport').mockResolvedValue();

    renderWithClient(
      <ErrorList
        errors={mockPreviewRejected.errors}
        importId={mockPreviewRejected.importId}
        fileName={mockPreviewRejected.fileName}
      />,
    );

    expect(screen.getByText(/Nothing was imported/i)).toBeInTheDocument();
    expect(screen.getByText(/Imports in HarborCFO are completely atomic/i)).toBeInTheDocument();
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Amount must be non-zero number')).toBeInTheDocument();

    const downloadBtn = screen.getByTestId('download-error-report-btn');
    fireEvent.click(downloadBtn);
    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalledWith('imp_stage_2', 'invalid.csv');
    });
  });

  it('handles commit confirmation dialog and commit execution', async () => {
    const onCommitted = vi.fn();
    const onReset = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue(mockHistoryImports[0]);

    vi.spyOn(commitModule, 'useCommitImport').mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    renderWithClient(
      <CommitBar
        preview={mockPreviewSuccess}
        onCommitted={onCommitted}
        onReset={onReset}
      />,
    );

    // Open confirm dialog
    const commitBtn = screen.getByTestId('commit-import-btn');
    fireEvent.click(commitBtn);
    expect(screen.getByTestId('commit-confirm-dialog')).toBeInTheDocument();

    // Confirm commit
    const confirmBtn = screen.getByTestId('confirm-commit-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith('imp_stage_1');
      expect(onCommitted).toHaveBeenCalledWith(mockHistoryImports[0]);
    });
  });

  it('handles 409 conflict duplicate file error', async () => {
    const onCommitted = vi.fn();
    const onReset = vi.fn();
    const conflictError = {
      status: 409,
      code: 'CONFLICT',
      message: 'This file has already been committed',
      details: [{ field: 'checksum', message: 'imp_existing_999' }],
    };

    vi.spyOn(commitModule, 'useCommitImport').mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(conflictError),
      isPending: false,
    } as never);

    renderWithClient(
      <CommitBar
        preview={mockPreviewSuccess}
        onCommitted={onCommitted}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByTestId('commit-import-btn'));
    fireEvent.click(screen.getByTestId('confirm-commit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('duplicate-import-notice')).toBeInTheDocument();
      expect(screen.getByText('imp_existing_999')).toBeInTheDocument();
    });
  });

  it('renders read-only notice and hides upload dropzone for Reviewer role', () => {
    vi.spyOn(authFeature, 'usePermission').mockReturnValue(false);

    renderWithClient(<ImportWorkspace />);

    expect(screen.getByTestId('reviewer-readonly-notice')).toBeInTheDocument();
    expect(screen.queryByTestId('file-dropzone')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-history-table')).toBeInTheDocument();
  });

  it('triggers CSV template generation without crashing', () => {
    renderWithClient(<TemplateLinks />);
    expect(screen.getByTestId('download-transactions-template')).toBeInTheDocument();
    expect(screen.getByTestId('download-invoices-template')).toBeInTheDocument();
  });

  it('opens import details dialog when clicking a history row or details button', async () => {
    renderWithClient(<ImportHistoryTable />);

    // Row is rendered
    expect(screen.getByTestId('import-history-row-imp_hist_1')).toBeInTheDocument();

    // Click the row to open details
    fireEvent.click(screen.getByTestId('import-history-row-imp_hist_1'));

    const dialog = screen.getByTestId('import-details-dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('prior_tx.csv')).toBeInTheDocument();
    expect(within(dialog).getByText('imp_hist_1')).toBeInTheDocument();
    expect(within(dialog).getByText('Ledger Synchronized')).toBeInTheDocument();

    // Close the dialog
    fireEvent.click(screen.getByTestId('close-import-details-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('import-details-dialog')).not.toBeInTheDocument();
    });

    // Clicking the Details button also opens the dialog
    fireEvent.click(screen.getByTestId('view-details-imp_hist_1'));
    expect(screen.getByTestId('import-details-dialog')).toBeInTheDocument();
  });

  it('displays validation errors and export button in details dialog for rejected import', () => {
    const rejectedImport: ImportDto = {
      id: 'imp_hist_rej',
      tenantId: 'tenant_1',
      kind: 'invoices',
      fileName: 'bad_invoices.csv',
      checksum: 'hash_bad_456',
      mappingVersion: 1,
      status: 'rejected',
      rowCount: 10,
      acceptedRows: 0,
      rejectedRows: 10,
      errors: [
        { row: 3, field: 'total', message: 'Total must be positive' },
        { row: 5, field: 'dueDate', message: 'Invalid due date format' },
      ],
      actorId: 'usr_lead',
      expiresAt: '2026-10-17T00:00:00Z',
      createdAt: '2026-10-16T09:50:00Z',
      updatedAt: '2026-10-16T10:00:00Z',
    };

    vi.spyOn(importsListModule, 'useImports').mockReturnValue({
      data: [rejectedImport],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isRefetching: false,
    } as never);

    renderWithClient(<ImportHistoryTable />);

    fireEvent.click(screen.getByTestId('import-history-row-imp_hist_rej'));

    const dialog = screen.getByTestId('import-details-dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('bad_invoices.csv')).toBeInTheDocument();
    expect(within(dialog).getByText(/Atomic Rejection Guaranteed/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Total must be positive')).toBeInTheDocument();
    expect(within(dialog).getByText('Invalid due date format')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /export errors/i })).toBeInTheDocument();
  });

  it('allows owner to open delete confirmation dialog and delete an import', async () => {
    const mutateAsyncMock = vi.fn().mockResolvedValue({ deleted: true, importId: 'imp_hist_1' });
    vi.spyOn(deleteModule, 'useDeleteImport').mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as never);

    renderWithClient(<ImportHistoryTable />);

    const deleteBtn = screen.getByTestId('delete-import-imp_hist_1');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    const dialog = screen.getByTestId('delete-import-dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Delete Import Batch/i)).toBeInTheDocument();
    expect(within(dialog).getByText('prior_tx.csv')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-delete-import-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith('imp_hist_1');
    });
  });

  it('hides delete buttons for employee or reviewer role', () => {
    vi.spyOn(authFeature, 'useSession').mockReturnValue({ role: 'employee' } as never);

    renderWithClient(<ImportHistoryTable />);

    expect(screen.queryByTestId('delete-import-imp_hist_1')).not.toBeInTheDocument();
  });
});

