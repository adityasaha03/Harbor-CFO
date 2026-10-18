import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import {
  importPreviewBodySchema,
  importIdParamSchema,
  importsQuerySchema,
  transformImportInputSchema,
  IMPORT_LIMITS,
} from '@harbor/contracts';
import { asyncHandler } from '../../core/http/async-handler';
import { validate } from '../../core/http/validate';
import { ValidationError, PayloadTooLargeError } from '../../core/http/app-error';
import { createRateLimiter } from '../../core/security/rate-limit';
import { protect } from '../auth';
import {
  IMPORT_RATE_LIMIT_MAX,
  IMPORT_RATE_LIMIT_WINDOW_MS,
} from './imports.constants';
import { importsController } from './imports.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMPORT_LIMITS.MAX_FILE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
    const isAllowedMime =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === 'text/x-csv';

    if (isCsvExt || isAllowedMime) {
      cb(null, true);
    } else {
      cb(new ValidationError('Uploaded file must be a CSV'));
    }
  },
});

function handleUpload(req: Request, res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next(new ValidationError('Content-Type must be multipart/form-data'));
  }

  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new PayloadTooLargeError(
              `File exceeds maximum size of ${IMPORT_LIMITS.MAX_FILE_BYTES} bytes`,
            ),
          );
        }
        return next(new ValidationError(err.message));
      }
      return next(err);
    }
    next();
  });
}

const previewRateLimiter = createRateLimiter({
  windowMs: IMPORT_RATE_LIMIT_WINDOW_MS,
  max: IMPORT_RATE_LIMIT_MAX,
  keyGenerator: (req) => req.actor?.tenantId || req.ip || '127.0.0.1',
});

export const importsRouter: Router = Router();

// POST /api/v1/imports/transform (imports:write, rate limit 5/min per tenant)
importsRouter.post(
  '/transform',
  protect('imports:write'),
  previewRateLimiter,
  validate({ body: transformImportInputSchema }),
  asyncHandler(importsController.transform),
);

// POST /api/v1/imports/preview (imports:write, rate limit 5/min per tenant)
importsRouter.post(
  '/preview',
  protect('imports:write'),
  previewRateLimiter,
  handleUpload,
  validate({ body: importPreviewBodySchema }),
  asyncHandler(importsController.preview),
);

// POST /api/v1/imports/:id/commit (imports:write)
importsRouter.post(
  '/:id/commit',
  protect('imports:write'),
  validate({ params: importIdParamSchema }),
  asyncHandler(importsController.commit),
);

// GET /api/v1/imports (finance:read)
importsRouter.get(
  '/',
  protect('finance:read'),
  validate({ query: importsQuerySchema }),
  asyncHandler(importsController.list),
);

// GET /api/v1/imports/:id/errors.csv (finance:read)
importsRouter.get(
  '/:id/errors.csv',
  protect('finance:read'),
  validate({ params: importIdParamSchema }),
  asyncHandler(importsController.getErrorsCsv),
);

// GET /api/v1/imports/:id (finance:read)
importsRouter.get(
  '/:id',
  protect('finance:read'),
  validate({ params: importIdParamSchema }),
  asyncHandler(importsController.getById),
);

// DELETE /api/v1/imports/:id (settings:manage - owner only)
importsRouter.delete(
  '/:id',
  protect('settings:manage'),
  validate({ params: importIdParamSchema }),
  asyncHandler(importsController.delete),
);

