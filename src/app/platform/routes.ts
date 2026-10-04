import { Routes } from '@angular/router';

export const PLATFORM_ROUTES: Routes = [
  {
    path: 'tenants',
    loadComponent: () => import('./tenants.component').then((m) => m.TenantsComponent),
  },
  {
    path: 'admins',
    loadComponent: () => import('./admins.component').then((m) => m.AdminsComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'tenants' },
];
