import { Authority } from '../core/api.models';
import { encodeMockToken } from '../core/jwt';
import { Session, SessionKind } from '../auth/auth.service';

const STORAGE_KEY = 'easymk-config.session';

export function fakeAccessToken(roles: Authority[], tenantId: number | undefined = 1): string {
  return encodeMockToken({
    sub: '1',
    tenantId,
    roles,
    exp: Math.floor(Date.now() / 1000) + 600,
  });
}

/**
 * Stores a session the way AuthService persists it. Call before the first
 * TestBed.inject(AuthService), which reads storage on construction.
 */
export function seedSession(roles: Authority[], kind: SessionKind = 'tenant'): Session {
  const session: Session = {
    kind,
    email: 'test@easymk.mx',
    accessToken: fakeAccessToken(roles, kind === 'platform' ? undefined : 1),
    refreshToken: kind === 'tenant' ? 'refresh-1' : null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
