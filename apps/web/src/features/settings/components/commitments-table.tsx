'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { CommitmentDto } from '@harbor/contracts';
import { Money } from '@/components/data/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCommitments } from '../api/use-commitments';
import { useDeleteCommitment } from '../api/use-commitment-mutations';
import { CommitmentFormDialog } from './commitment-form';
import { Plus, Pencil, Trash2, CalendarClock, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CommitmentsTableProps {
  isReadOnly?: boolean;
}

export function CommitmentsTable({ isReadOnly = false }: CommitmentsTableProps) {
  const { data: commitments = [], isLoading, error } = useCommitments();
  const deleteMutation = useDeleteCommitment();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCommitment, setEditingCommitment] = React.useState<CommitmentDto | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleEdit = (commitment: CommitmentDto) => {
    setEditingCommitment(commitment);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingCommitment(null);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success('Commitment deleted');
      setDeletingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete commitment');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Recurring Commitments</CardTitle>
          <CardDescription>
            Recurring cash flows (such as payroll, rent, and loan repayments) projected into the 91-day cash forecast.
          </CardDescription>
        </div>
        {!isReadOnly && (
          <Button onClick={handleAdd} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Commitment
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isReadOnly && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You have read-only access. Only company Owners can manage recurring commitments.
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2 items-center">
          <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Payroll, rent, and overhead commitments are automatically projected across upcoming weeks until their end date.
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading commitments...</div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">Failed to load commitments: {error.message}</div>
        ) : commitments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recurring commitments found. Add obligations like payroll or rent to enhance forecast accuracy.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>First Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {!isReadOnly && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.label}</TableCell>
                    <TableCell className="capitalize">{c.category.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={c.direction === 'inflow' ? 'default' : 'outline'}>
                        {c.direction === 'inflow' ? 'Inflow' : 'Outflow'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{c.frequency}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.anchorOn}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{c.endOn || 'Ongoing'}</TableCell>
                    <TableCell className="text-right font-medium">
                      <Money minor={c.amountMinor} />
                    </TableCell>
                    {!isReadOnly && (
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(c)}
                          aria-label={`Edit ${c.label}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(c.id)}
                          aria-label={`Delete ${c.label}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CommitmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        commitmentToEdit={editingCommitment}
      />

      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Commitment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring commitment? The 91-day cash forecast will automatically recompute without it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
