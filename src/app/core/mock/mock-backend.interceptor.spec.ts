import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { clearSession } from '../../testing/session';
import { AccountSummary, InvitationResponse, TenantResponse } from '../api.models';
import { authInterceptor } from '../auth.interceptor';
import { mockBackendInterceptor, resetMockBackend } from './mock-backend.interceptor';
import { MOCK_PASSWORD } from './mock-data';

describe('mockBackendInterceptor', () => {
  let http: HttpClient;
  let auth: AuthService;
  const original = environment.useMocks;

  beforeEach(() => {
    environment.useMocks = true;
    resetMockBackend();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor]))],
    });
    http = TestBed.inject(HttpClient);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    environment.useMocks = original;
    clearSession();
  });

  async function status(promise: Promise<unknown>): Promise<number> {
    try {
      await promise;
      return 200;
    } catch (e) {
      return (e as HttpErrorResponse).status;
    }
  }

  it('should require valid credentials and a token', async () => {
    expect(await status(firstValueFrom(auth.login('admin@easymk.mx', 'nope')))).toBe(401);
    expect(await status(firstValueFrom(http.get('/api/marketplace-accounts')))).toBe(401);
  });

  it('should manage the seller accounts, rejecting bad Walmart credentials with 422', async () => {
    await firstValueFrom(auth.login('admin@easymk.mx', MOCK_PASSWORD));
    const body = { sellerId: '2', market: 'MX', clientId: 'client-xyz9', clientSecret: 'invalid' };

    expect(await status(firstValueFrom(http.post('/api/marketplace-accounts', body)))).toBe(422);
    const account = await firstValueFrom(
      http.post<AccountSummary>('/api/marketplace-accounts', { ...body, clientSecret: 'ok' }),
    );
    expect(account.clientIdHint).toBe('****xyz9');

    const updated = await firstValueFrom(
      http.patch<AccountSummary>(`/api/marketplace-accounts/${account.id}/status`, { status: 'INACTIVE' }),
    );
    expect(updated.status).toBe('INACTIVE');

    const list = await firstValueFrom(http.get<AccountSummary[]>('/api/marketplace-accounts'));
    expect(list.length).toBe(2);
  });

  it('should forbid seller configuration to a user without ADMIN', async () => {
    await firstValueFrom(auth.login('ordenes@easymk.mx', MOCK_PASSWORD));

    expect(await status(firstValueFrom(http.get('/api/marketplace-accounts')))).toBe(403);
    expect(await status(firstValueFrom(http.post('/api/tenant/invitations', { roles: ['ADMIN'] })))).toBe(403);
  });

  it('should let staff create a seller, invite its admin and add platform admins', async () => {
    await firstValueFrom(auth.platformLogin('staff@easymk.mx', MOCK_PASSWORD));

    expect(await status(firstValueFrom(http.post('/api/platform/tenants', { name: 'X', legalName: 'X', rfc: 'SHORT' })))).toBe(400);
    const tenant = await firstValueFrom(
      http.post<TenantResponse>('/api/platform/tenants', { name: 'X', legalName: 'X SA', rfc: 'XAX010101AB1' }),
    );
    expect(tenant.status).toBe('PENDING_ACTIVATION');

    const invitation = await firstValueFrom(
      http.post<InvitationResponse>(`/api/platform/tenants/${tenant.id}/invitations`, {
        email: 'a@x.com',
        firstName: 'A',
        lastName: 'B',
        phone: null,
      }),
    );
    expect(invitation.token).toMatch(/^inv-/);

    expect(await status(firstValueFrom(http.post('/api/platform/admins', { email: 'staff@easymk.mx', password: 'password-2' })))).toBe(409);
  });

  it('should keep sellers out of the platform API', async () => {
    await firstValueFrom(auth.login('admin@easymk.mx', MOCK_PASSWORD));

    expect(await status(firstValueFrom(http.post('/api/platform/admins', {})))).toBe(403);
  });
});
