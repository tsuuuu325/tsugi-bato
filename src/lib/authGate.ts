import { isAuthConfigured } from '@/lib/auth';
import { getUserProfile } from '@/lib/profile';

export function creationRequiresLogin(): boolean {
  return isAuthConfigured();
}

export function isCreationLoggedIn(): boolean {
  return Boolean(getUserProfile().authUserId?.trim());
}

export function assertCanCreateMusic(): { ok: true } | { ok: false; reason: 'loginRequiredToCreate' } {
  if (!creationRequiresLogin()) return { ok: true };
  if (!isCreationLoggedIn()) return { ok: false, reason: 'loginRequiredToCreate' };
  return { ok: true };
}

export function loginPathFor(nextPath: string): string {
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  return `/login?next=${encodeURIComponent(next)}`;
}
