import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const SELLER_NAV: NavItem[] = [
  { label: 'Cuentas Walmart', path: '/accounts', icon: 'storefront' },
  { label: 'Usuarios', path: '/users', icon: 'group' },
];

const PLATFORM_NAV: NavItem[] = [
  { label: 'Sellers', path: '/platform/tenants', icon: 'add_business' },
  { label: 'Administradores', path: '/platform/admins', icon: 'admin_panel_settings' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatSidenavModule, MatIconModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly useMocks = environment.useMocks;
  /** Sellers can jump back to the day-to-day app. */
  readonly webAppUrl = environment.webAppUrl || '/';
  readonly isPlatform = this.authService.isPlatform;
  readonly email = computed(() => this.authService.session()?.email || 'Usuario');
  readonly roleLabel = computed(() => (this.isPlatform() ? 'Staff EasyMK' : 'Administrador'));
  readonly navItems = computed(() => (this.isPlatform() ? PLATFORM_NAV : SELLER_NAV));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Label of the nav item matching the current URL, shown in the top bar. */
  readonly currentSection = computed(
    () => this.navItems().find((item) => this.url().startsWith(item.path))?.label ?? '',
  );

  logout(): void {
    const target = this.isPlatform() ? '/platform/login' : '/login';
    this.authService.logout();
    this.router.navigateByUrl(target);
  }
}
