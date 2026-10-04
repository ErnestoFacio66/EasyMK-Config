import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import {
  AccessTokenResponse,
  Authority,
  AuthTokensResponse,
  LoginRequest,
} from '../core/api.models';
import { apiUrl } from '../core/api-url';
import { AccessTokenClaims, decodeAccessToken } from '../core/jwt';

/** A seller's user (tenant-scoped) or an EasyMK staff member (platform). */
export type SessionKind = 'tenant' | 'platform';

export interface Session {
  kind: SessionKind;
  email: string;
  accessToken: string;
  /** Only tenant sessions get one; platform admins log in again when it expires. */
  refreshToken: string | null;
}

const STORAGE_KEY = 'easymk-config.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly state = signal<Session | null>(readStoredSession());
  private refreshInFlight: Observable<string> | null = null;

  readonly session = this.state.asReadonly();
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly isPlatform = computed(() => this.state()?.kind === 'platform');
  readonly claims = computed<AccessTokenClaims | null>(() => {
    const session = this.state();
    return session ? decodeAccessToken(session.accessToken) : null;
  });
  readonly roles = computed<Authority[]>(() => this.claims()?.roles ?? []);

  hasRole(role: Authority): boolean {
    return this.roles().includes(role);
  }

  /** Tenant user login: POST /auth/login. */
  login(email: string, password: string): Observable<void> {
    const body: LoginRequest = { email, password };
    return this.http.post<AuthTokensResponse>(apiUrl('/auth/login'), body).pipe(
      tap((tokens) => this.start('tenant', email, tokens.accessToken, tokens.refreshToken)),
      map(() => undefined),
    );
  }

  /** EasyMK staff login: POST /platform/auth/login. */
  platformLogin(email: string, password: string): Observable<void> {
    const body: LoginRequest = { email, password };
    return this.http.post<AccessTokenResponse>(apiUrl('/platform/auth/login'), body).pipe(
      tap((response) => this.start('platform', email, response.accessToken, null)),
      map(() => undefined),
    );
  }

  /** Accepting an invitation sets the password and logs the new user in. */
  acceptInvitation(token: string, password: string, email = ''): Observable<void> {
    return this.http
      .post<AuthTokensResponse>(apiUrl(`/invitations/${encodeURIComponent(token)}/accept`), {
        password,
      })
      .pipe(
        tap((tokens) => this.start('tenant', email, tokens.accessToken, tokens.refreshToken)),
        map(() => undefined),
      );
  }

  /**
   * Exchanges the refresh token for a new access token. Concurrent callers
   * share one request so a burst of 401s triggers a single refresh.
   */
  refresh(): Observable<string> {
    const session = this.state();
    if (!session?.refreshToken) {
      throw new Error('No refresh token available');
    }
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http
        .post<AccessTokenResponse>(apiUrl('/auth/refresh'), { refreshToken: session.refreshToken })
        .pipe(
          map((response) => response.accessToken),
          tap((accessToken) => this.update({ ...session, accessToken })),
          finalize(() => (this.refreshInFlight = null)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight;
  }

  canRefresh(): boolean {
    return !!this.state()?.refreshToken;
  }

  /** Revokes the refresh token (best effort) and clears the local session. */
  logout(): void {
    const refreshToken = this.state()?.refreshToken;
    if (refreshToken) {
      this.http.post(apiUrl('/auth/logout'), { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearSession();
  }

  clearSession(): void {
    this.update(null);
  }

  private start(kind: SessionKind, email: string, accessToken: string, refreshToken: string | null) {
    this.update({ kind, email, accessToken, refreshToken });
  }

  private update(session: Session | null): void {
    this.state.set(session);
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable (private mode); the session then lasts for this tab only.
    }
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as Session;
    return session.accessToken && decodeAccessToken(session.accessToken) ? session : null;
  } catch {
    return null;
  }
}
