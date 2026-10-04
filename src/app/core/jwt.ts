import { Authority } from './api.models';

/** Claims EasyMK-Backend puts in its access tokens (see JwtService). */
export interface AccessTokenClaims {
  /** User id (tenant user or platform admin). */
  sub: string;
  /** Absent for platform admins. */
  tenantId?: number;
  roles: Authority[];
  /** Expiry, seconds since epoch. */
  exp: number;
}

/**
 * Reads the payload of a JWT without verifying it - the backend verifies on
 * every request; the front only needs the claims to drive the UI.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json) as AccessTokenClaims;
    return Array.isArray(claims.roles) && typeof claims.exp === 'number' ? claims : null;
  } catch {
    return null;
  }
}

/** Builds an unsigned token with the same claim layout; used only by the mock backend. */
export function encodeMockToken(claims: AccessTokenClaims): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.mock`;
}
