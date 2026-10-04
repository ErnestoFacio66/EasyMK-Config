import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { clearSession, fakeAccessToken, seedSession } from '../testing/session';

describe('AuthService', () => {
  let http: HttpTestingController;

  function setup(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  afterEach(() => {
    http.verify();
    clearSession();
  });

  it('should start unauthenticated', () => {
    expect(setup().isAuthenticated()).toBeFalse();
  });

  it('should log a tenant user in and expose the roles from the token', () => {
    const service = setup();

    service.login('admin@easymk.mx', 'secret').subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'admin@easymk.mx', password: 'secret' });
    req.flush({ accessToken: fakeAccessToken(['ADMIN', 'ORDERS_MANAGER']), refreshToken: 'r1' });

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.isPlatform()).toBeFalse();
    expect(service.hasRole('ORDERS_MANAGER')).toBeTrue();
    expect(service.session()?.refreshToken).toBe('r1');
  });

  it('should log platform staff in without a refresh token', () => {
    const service = setup();

    service.platformLogin('staff@easymk.mx', 'secret').subscribe();
    http.expectOne('/api/platform/auth/login').flush({
      accessToken: fakeAccessToken(['PLATFORM_ADMIN'], undefined),
    });

    expect(service.isPlatform()).toBeTrue();
    expect(service.hasRole('PLATFORM_ADMIN')).toBeTrue();
    expect(service.canRefresh()).toBeFalse();
  });

  it('should stay logged out when the credentials are rejected', () => {
    const service = setup();
    let failed = false;

    service.login('admin@easymk.mx', 'wrong').subscribe({ error: () => (failed = true) });
    http.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBeTrue();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should restore a stored session', () => {
    seedSession(['ORDERS_MANAGER']);

    expect(setup().hasRole('ORDERS_MANAGER')).toBeTrue();
  });

  it('should share one refresh request between concurrent callers', () => {
    seedSession(['ORDERS_MANAGER']);
    const service = setup();
    const tokens: string[] = [];

    service.refresh().subscribe((t) => tokens.push(t));
    service.refresh().subscribe((t) => tokens.push(t));
    const req = http.expectOne('/api/auth/refresh');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush({ accessToken: 'new-token' });

    expect(tokens).toEqual(['new-token', 'new-token']);
    expect(service.session()?.accessToken).toBe('new-token');
  });

  it('should revoke the refresh token on logout', () => {
    seedSession(['ORDERS_MANAGER']);
    const service = setup();

    service.logout();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });

    expect(service.isAuthenticated()).toBeFalse();
  });
});
