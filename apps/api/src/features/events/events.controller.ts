import type { Request, RequestHandler, Response } from 'express';
import type { EventsReplayQuery } from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { ok } from '../../core/http/respond';
import { eventsService } from './events.service';
import { handleEventsStream } from './sse';

export const eventsController: {
  replay: RequestHandler;
  stream: RequestHandler;
} = {
  replay: asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.actor!.tenantId;
    const query = req.query as unknown as EventsReplayQuery;

    const events = await eventsService.replay(tenantId, query);
    ok(res, events);
  }),

  stream: asyncHandler(async (req: Request, res: Response) => {
    await handleEventsStream(req, res);
  }),
};
