export { authClient, type AuthClient } from './lib/auth-client';
export {
  getApiToken,
  clearApiToken,
  parseJwtExpiration,
} from './lib/api-token';
export {
  statement,
  ac,
  ownerRole,
  employeeRole,
  reviewerRole,
  roles,
  validateContractRoles,
  type HarborRole,
} from './server/access-control';

// Client hooks and components
export { useSession, type UseSessionReturn } from './hooks/use-session';
export { SignInForm, type SignInValues } from './components/sign-in-form';
export { SignUpForm, type SignUpValues } from './components/sign-up-form';
export { SignOutButton, type SignOutButtonProps } from './components/sign-out-button';
export { UserMenu } from './components/user-menu';
export { DemoAccountPicker, type DemoAccountPickerProps } from './components/demo-account-picker';
export { usePermission } from './hooks/use-permission';
export { useMe, type MeResponse } from './hooks/use-me';
export { Can, type CanProps } from './components/can';
export { ForbiddenState, type ForbiddenStateProps } from './components/forbidden-state';
export {
  PROTECTED_ROUTES,
  isValidProtectedRoute,
} from './lib/protected-routes';
