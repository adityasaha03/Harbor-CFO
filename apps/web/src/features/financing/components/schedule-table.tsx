'use client';

import { Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMinor, type RepaymentScheduleItem } from '@harbor/contracts';

interface ScheduleTableProps {
  installments: RepaymentScheduleItem[];
  totalRepaymentMinor: number;
}

export function ScheduleTable({
  installments,
  totalRepaymentMinor,
}: ScheduleTableProps) {
  return (
    <div className="rounded-md border border-border/60 overflow-hidden text-xs bg-background/50">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 py-2 text-[11px] font-semibold">Inst. #</TableHead>
            <TableHead className="py-2 text-[11px] font-semibold">Due Date</TableHead>
            <TableHead className="py-2 text-[11px] font-semibold text-right">Repayment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((item) => (
            <TableRow key={item.installmentIndex} className="hover:bg-muted/30">
              <TableCell className="py-2 font-mono text-muted-foreground">
                #{item.installmentIndex}
              </TableCell>
              <TableCell className="py-2 flex items-center gap-1.5 font-medium">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {item.dueOn}
              </TableCell>
              <TableCell className="py-2 text-right font-mono font-medium">
                {formatMinor(item.amountMinor)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-semibold bg-muted/20">
            <TableCell colSpan={2} className="py-2 text-muted-foreground">
              Total Scheduled Repayments
            </TableCell>
            <TableCell className="py-2 text-right font-mono text-foreground font-bold">
              {formatMinor(totalRepaymentMinor)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
