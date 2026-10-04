import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, delay, dematerialize, materialize, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccountSummary,
  Authority,
  ConnectAccountRequest,
  CreatePlatformAdminRequest,
  CreateTenantRequest,
  InviteFirstAdminRequest,
  InviteUserRequest,
  LoginRequest,
  RoleCode,
  TenantResponse,
} from '../api.models';
import { decodeAccessToken, encodeMockToken } from '../jwt';
import {
  MOCK_ACCOUNTS,
  MOCK_PLATFORM_ADMINS,
  MOCK_TENANTS,
  MOCK_USERS,
  MockUser,
} from './mock-data';

/**
 * In-memory stand-in for the EasyMK-Backend endpoints this app uses
 * (auth, marketplace accounts, tenant invitations, platform), enabled by
 * `environment.useMocks`. Same paths, shapes and status codes as the backend.
 */

const ALL_ROLES: RoleCode[] = ['ADMIN', 'ORDERS_MANAGER', 'CATALOG_MANAGER'];
const ACCESS_TTL_SECONDS = 20 * 60;
const LATENCY_MS = 250;

/** Mutable state for this browser tab. Reset with resetMockBackend() (tests). */
class MockState {
  users = MOCK_USERS.map((u) => ({ ...u, roles: [...u.roles] }));
  platformAdmins = MOCK_PLATFORM_ADMINS.map((a) => ({ ...a }));
  tenants = MOCK_TENANTS.map((t) => ({ ...t }));
  accounts = MOCK_ACCOUNTS.map((a) => ({ ...a }));
  refreshTokens = new Map<string, number>();
  seq = 100;

  nextId(): number {
    return ++this.seq;
  }
}

let state = new MockState();

export function resetMockBackend(): void {
  state = new MockState();
}

// --- helpers ------------------------------------------------------------

function ok<T>(body: T, status = 200): Observable<HttpEvent<T>> {
  return of(new HttpResponse({ status, body }));
}

function noContent(): Observable<HttpEvent<unknown>> {
  return of(new HttpResponse({ status: 204, body: null }));
}

function fail(status: number, message: string | null = null): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: message, statusText: String(status) }));
}

function token(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function issueUserTokens(user: MockUser) {
  const roles = user.roles.includes('ADMIN') ? ALL_ROLES : user.roles;
  const accessToken = encodeMockToken({
    sub: String(user.id),
    tenantId: user.tenantId,
    roles,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  });
  const refreshToken = token('refresh');
  state.refreshTokens.set(refreshToken, user.id);
  return { accessToken, refreshToken };
}

function publicAccount(account: AccountSummary & { tenantId: number }): AccountSummary {
  const { tenantId: _tenantId, ...rest } = account;
  return rest;
}

function hint(clientId: string): string {
  return clientId.length > 4 ? `****${clientId.slice(-4)}` : '****';
}

function invitation() {
  // Acceptance happens in EasyMK-WebApp, so only the response shape matters here.
  return { invitationId: state.nextId(), token: token('inv') };
}

// --- handlers -----------------------------------------------------------

type Caller = { tenantId: number | null; roles: Authority[] };

function handle(req: HttpRequest<unknown>, path: string): Observable<HttpEvent<unknown>> {
  const method = req.method;
  const body = (req.body ?? {}) as Record<string, unknown>;

  // Public endpoints.
  if (method === 'POST' && path === '/auth/login') {
    const { email, password } = body as unknown as LoginRequest;
    const user = state.users.find((u) => u.email === email && u.password === password);
    return user ? ok(issueUserTokens(user)) : fail(401);
  }
  if (method === 'POST' && path === '/auth/refresh') {
    const userId = state.refreshTokens.get(String(body['refreshToken']));
    const user = state.users.find((u) => u.id === userId);
    return user ? ok({ accessToken: issueUserTokens(user).accessToken }) : fail(401);
  }
  if (method === 'POST' && path === '/platform/auth/login') {
    const { email, password } = body as unknown as LoginRequest;
    const admin = state.platformAdmins.find((a) => a.email === email && a.password === password);
    if (!admin) return fail(401);
    return ok({
      accessToken: encodeMockToken({
        sub: String(admin.id),
        roles: ['PLATFORM_ADMIN'],
        exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
      }),
    });
  }

  // Everything else requires a valid, unexpired access token.
  const header = req.headers.get('Authorization') ?? '';
  const claims = header.startsWith('Bearer ') ? decodeAccessToken(header.slice(7)) : null;
  if (!claims || claims.exp * 1000 < Date.now()) {
    return fail(401);
  }
  const caller: Caller = { tenantId: claims.tenantId ?? null, roles: claims.roles };
  const requires = (role: Authority) => caller.roles.includes(role);

  if (method === 'POST' && path === '/auth/logout') {
    state.refreshTokens.delete(String(body['refreshToken']));
    return noContent();
  }
  if (path.startsWith('/marketplace-accounts')) {
    return requires('ADMIN') ? accounts(method, path, body, caller) : fail(403);
  }
  if (method === 'POST' && path === '/tenant/invitations') {
    if (!requires('ADMIN')) return fail(403);
    const request = body as unknown as InviteUserRequest;
    if (!request.roles?.length) return fail(400, 'At least one role is required');
    return ok(invitation(), 201);
  }
  if (path.startsWith('/platform/')) {
    return requires('PLATFORM_ADMIN') ? platform(method, path, body) : fail(403);
  }
  return fail(404);
}

function accounts(
  method: string,
  path: string,
  body: Record<string, unknown>,
  caller: Caller,
): Observable<HttpEvent<unknown>> {
  const owned = state.accounts.filter((a) => a.tenantId === caller.tenantId);
  const rejected = (secret: unknown) => String(secret).toLowerCase().includes('invalid');

  if (method === 'GET' && path === '/marketplace-accounts') {
    return ok(owned.map(publicAccount));
  }
  if (method === 'POST' && path === '/marketplace-accounts') {
    const request = body as unknown as ConnectAccountRequest;
    if (rejected(request.clientSecret)) {
      return fail(422, 'Walmart rejected the client id or client secret (HTTP 401)');
    }
    const account = {
      id: state.nextId(),
      tenantId: caller.tenantId!,
      sellerId: request.sellerId,
      market: request.market,
      status: 'ACTIVE' as const,
      clientIdHint: hint(request.clientId),
    };
    state.accounts.push(account);
    return ok(publicAccount(account), 201);
  }

  const match = path.match(/^\/marketplace-accounts\/(\d+)\/(credentials|status)$/);
  const account = match ? owned.find((a) => a.id === Number(match[1])) : undefined;
  if (!match || !account) return fail(404);

  if (method === 'PUT' && match[2] === 'credentials') {
    if (rejected(body['clientSecret'])) {
      return fail(422, 'Walmart rejected the client id or client secret (HTTP 401)');
    }
    account.clientIdHint = hint(String(body['clientId']));
    return ok(publicAccount(account));
  }
  if (method === 'PATCH' && match[2] === 'status') {
    account.status = body['status'] === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return ok(publicAccount(account));
  }
  return fail(404);
}

function platform(method: string, path: string, body: Record<string, unknown>): Observable<HttpEvent<unknown>> {
  if (method === 'POST' && path === '/platform/tenants') {
    const request = body as unknown as CreateTenantRequest;
    if (!request.rfc || request.rfc.length < 12 || request.rfc.length > 13) {
      return fail(400, 'rfc must have 12 or 13 characters');
    }
    const tenant: TenantResponse = { id: state.nextId(), ...request, status: 'PENDING_ACTIVATION' };
    state.tenants.push(tenant);
    return ok(tenant, 201);
  }
  const invite = path.match(/^\/platform\/tenants\/(\d+)\/invitations$/);
  if (method === 'POST' && invite) {
    if (!state.tenants.some((t) => t.id === Number(invite[1]))) {
      return fail(400, `Tenant not found: ${invite[1]}`);
    }
    const request = body as unknown as InviteFirstAdminRequest;
    return request.email ? ok(invitation(), 201) : fail(400, 'email is required');
  }
  if (method === 'POST' && path === '/platform/admins') {
    const request = body as unknown as CreatePlatformAdminRequest;
    if (state.platformAdmins.some((a) => a.email === request.email)) {
      return fail(409, `A platform admin with email ${request.email} already exists`);
    }
    const admin = { id: state.nextId(), email: request.email, password: request.password };
    state.platformAdmins.push(admin);
    return ok({ id: admin.id, email: admin.email }, 201);
  }
  return fail(404);
}

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const prefix = `${environment.apiBaseUrl}/`;
  if (!environment.useMocks || !req.url.startsWith(prefix)) {
    return next(req);
  }
  const path = req.url.slice(environment.apiBaseUrl.length).split('?')[0];
  // materialize/dematerialize so errors are delayed like successes.
  return handle(req, path).pipe(materialize(), delay(LATENCY_MS), dematerialize());
};
