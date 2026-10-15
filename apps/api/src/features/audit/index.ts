import { setDenialAuditLogger } from '../auth';
import { auditService } from './audit.service';

// Register audit recording hook for authentication and authorization denials
setDenialAuditLogger((input) => auditService.record(input));

export * from './audit.model';
export * from './audit.repository';
export * from './audit.service';
export * from './audit.controller';
export * from './audit.routes';

