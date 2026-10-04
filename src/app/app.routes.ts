import { Routes } from '@angular/router';
import { platformGuard, sellerAdminGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'platform/login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
    data: { mode: 'platform' },
  },
  {
    path: 'platform',
    canActivate: [platformGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    loadChildren: () => import('./platform/routes').then((m) => m.PLATFORM_ROUTES),
  },
  {
    path: '',
    canActivate: [sellerAdminGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'accounts',
        loadComponent: () =>
          import('./seller/accounts-page.component').then((m) => m.AccountsPageComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./seller/users-page.component').then((m) => m.UsersPageComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'accounts' },
    ],
  },
  { path: '**', redirectTo: '' },
];
