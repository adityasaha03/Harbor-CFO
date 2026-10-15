export { authClient, type AuthClient } from './lib/auth-client';
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
export { getServerSession, requireServerSession } from './server/session';
export { auth, type Auth } from './server/auth';
export { GET, POST } from './server/handler';

// Client hooks and components
export { useSession, type UseSessionReturn } from './hooks/use-session';
export { SignInForm, type SignInValues } from './components/sign-in-form';
export { SignUpForm, type SignUpValues } from './components/sign-up-form';
export { SignOutButton, type SignOutButtonProps } from './components/sign-out-button';
export { UserMenu } from './components/user-menu';
export { DemoAccountPicker, type DemoAccountPickerProps } from './components/demo-account-picker';
