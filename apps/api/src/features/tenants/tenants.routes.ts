import { Router } from 'express';
import { updateTenantSettingsSchema } from '@harbor/contracts';
import { protect } from '../auth';
import { validate } from '../../core/http/validate';
import { tenantsController } from './tenants.controller';

const router = Router();

// GET /api/v1/tenant-settings (finance:read)
router.get('/', ...protect('finance:read'), tenantsController.getSettings);

// PATCH /api/v1/tenant-settings (settings:manage)
router.patch(
  '/',
  ...protect('settings:manage'),
  validate({ body: updateTenantSettingsSchema }),
  tenantsController.updateSettings,
);

export const tenantSettingsRouter: Router = router;

