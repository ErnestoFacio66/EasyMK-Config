import { AccountStatus, Market, RoleCode, TenantStatus } from './api.models';

/** Spanish labels for the backend's enum values. */

export const ROLES: { code: RoleCode; label: string; description: string }[] = [
  { code: 'ADMIN', label: 'Administrador', description: 'Acceso total, incluidas cuentas y usuarios.' },
  { code: 'ORDERS_MANAGER', label: 'Órdenes', description: 'Consulta y gestiona órdenes y envíos.' },
  { code: 'CATALOG_MANAGER', label: 'Catálogo', description: 'Gestiona artículos del catálogo.' },
];

export const MARKETS: { code: Market; label: string }[] = [
  { code: 'MX', label: 'México' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'CA', label: 'Canadá' },
  { code: 'CL', label: 'Chile' },
];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  PENDING_ACTIVATION: 'Pendiente de activación',
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
};
