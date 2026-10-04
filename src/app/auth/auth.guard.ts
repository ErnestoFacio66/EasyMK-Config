import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Seller configuration: requires a tenant session holding ADMIN (the
 * backend's @PreAuthorize for accounts and invitations). Platform staff are
 * sent to their console.
 */
export const sellerAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (auth.isPlatform()) {
    return router.createUrlTree(['/platform']);
  }
  return auth.hasRole('ADMIN') ? true : router.createUrlTree(['/login']);
};

/** EasyMK staff console: requires a platform session. */
export const platformGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.hasRole('PLATFORM_ADMIN')) {
    return true;
  }
  return router.createUrlTree(['/platform/login']);
};
