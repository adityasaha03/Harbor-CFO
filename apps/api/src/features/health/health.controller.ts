import type { Request, Response } from 'express';
import { ok } from '../../core/http/respond';

export type ReadinessCheckFn = () => Promise<boolean> | boolean;

let readinessCheck: ReadinessCheckFn = () => true;

export function setReadinessCheck(fn: ReadinessCheckFn): void {
  readinessCheck = fn;
}

export function resetReadinessCheck(): void {
  readinessCheck = () => true;
}

export function liveHandler(_req: Request, res: Response): void {
  ok(res, { status: 'ok', uptime: process.uptime() });
}

export async function readyHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  const isReady = await readinessCheck();
  if (!isReady) {
    res.status(503).json({
      error: {
        code: 'INTERNAL',
        message: 'Service not ready',
      },
    });
    return;
  }
  ok(res, { status: 'ready' });
}
