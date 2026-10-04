import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { clearSession, seedSession } from '../testing/session';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    backend.verify();
    clearSession();
  });

  it('should send the access token to the backend', () => {
    const session = seedSession(['ORDERS_MANAGER']);
    setup();

    http.get('/api/orders').subscribe();

    const req = backend.expectOne('/api/orders');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${session.accessToken}`);
    req.flush([]);
  });

  it('should not touch requests outside the API', () => {
    seedSession(['ORDERS_MANAGER']);
    setup();

    http.get('/assets/x.json').subscribe();

    expect(backend.expectOne('/assets/x.json').request.headers.has('Authorization')).toBeFalse();
  });

  it('should refresh once on 401 and retry with the new token', () => {
    seedSession(['ORDERS_MANAGER']);
    setup();
    let result: unknown;

    http.get('/api/orders').subscribe((r) => (result = r));
    backend.expectOne('/api/orders').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush({ accessToken: 'fresh' });
    const retry = backend.expectOne('/api/orders');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush(['ok']);

    expect(result).toEqual(['ok']);
  });

  it('should end the session and go to login when the refresh fails', () => {
    seedSession(['ORDERS_MANAGER']);
    setup();
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    http.get('/api/orders').subscribe({ error: () => undefined });
    backend.expectOne('/api/orders').flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('should send platform staff back to the platform login (no refresh token)', () => {
    seedSession(['PLATFORM_ADMIN'], 'platform');
    setup();
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');

    http.post('/api/platform/admins', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/platform/admins').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).toHaveBeenCalledWith('/platform/login');
  });
});
