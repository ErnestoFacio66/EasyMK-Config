import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { clearSession, seedSession } from '../testing/session';
import { platformGuard, sellerAdminGuard } from './auth.guard';

describe('auth guards', () => {
  let router: Router;

  function setup(): void {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    router = TestBed.inject(Router);
  }

  afterEach(() => clearSession());

  function url(result: unknown): string {
    expect(result instanceof UrlTree).toBeTrue();
    return router.serializeUrl(result as UrlTree);
  }

  function run(guard: typeof sellerAdminGuard) {
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  }

  it('should send anonymous users to /login', () => {
    setup();
    expect(url(run(sellerAdminGuard))).toBe('/login');
  });

  it('should let seller admins in', () => {
    seedSession(['ADMIN', 'ORDERS_MANAGER', 'CATALOG_MANAGER']);
    setup();
    expect(run(sellerAdminGuard)).toBeTrue();
  });

  it('should keep sellers without ADMIN out', () => {
    seedSession(['ORDERS_MANAGER']);
    setup();
    expect(url(run(sellerAdminGuard))).toBe('/login');
  });

  it('should send platform staff to their console and keep sellers out of it', () => {
    seedSession(['PLATFORM_ADMIN'], 'platform');
    setup();
    expect(url(run(sellerAdminGuard))).toBe('/platform');
    expect(run(platformGuard)).toBeTrue();
  });

  it('should require a platform session for the console', () => {
    seedSession(['ADMIN']);
    setup();
    expect(url(run(platformGuard))).toBe('/platform/login');
  });
});
