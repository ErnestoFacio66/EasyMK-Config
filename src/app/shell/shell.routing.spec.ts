import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { Authority } from '../core/api.models';
import { clearSession, seedSession } from '../testing/session';

describe('Config routing', () => {
  let harness: RouterTestingHarness;

  async function setup(roles: Authority[], kind: 'tenant' | 'platform' = 'tenant') {
    seedSession(roles, kind);
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
    harness = await RouterTestingHarness.create();
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).match(() => true);
    clearSession();
  });

  function navLabels(selector = 'nav .nav-item'): string[] {
    const links = harness.routeNativeElement!.ownerDocument.querySelectorAll(
      selector,
    ) as NodeListOf<HTMLElement>;
    return Array.from(links).map((a) => a.querySelector('span')!.textContent!.trim());
  }

  it('should land a seller admin on their Walmart accounts', async () => {
    await setup(['ADMIN', 'ORDERS_MANAGER', 'CATALOG_MANAGER']);
    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/accounts');
    expect(navLabels()).toEqual(['Cuentas Walmart', 'Usuarios']);
    expect(harness.routeNativeElement!.ownerDocument.body.textContent).toContain('Ir a EasyMK');
  });

  it('should highlight the active section', async () => {
    await setup(['ADMIN', 'ORDERS_MANAGER', 'CATALOG_MANAGER']);
    await harness.navigateByUrl('/users');
    harness.detectChanges();

    expect(navLabels('nav .active-nav-item')).toEqual(['Usuarios']);
  });

  it('should give platform staff their own console', async () => {
    await setup(['PLATFORM_ADMIN'], 'platform');
    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/platform/tenants');
    expect(navLabels()).toEqual(['Sellers', 'Administradores']);
  });

  it('should send a seller without ADMIN to the login', async () => {
    await setup(['ORDERS_MANAGER']);
    await harness.navigateByUrl('/accounts');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
