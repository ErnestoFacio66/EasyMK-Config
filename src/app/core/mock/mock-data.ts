import { AccountSummary, RoleCode, TenantResponse } from '../api.models';

/** Seed data for the in-memory mock backend. Every value is fictitious. */

export interface MockUser {
  id: number;
  tenantId: number;
  email: string;
  password: string;
  roles: RoleCode[];
}

export interface MockPlatformAdmin {
  id: number;
  email: string;
  password: string;
}

export const MOCK_PASSWORD = 'password123';

export const MOCK_USERS: MockUser[] = [
  { id: 1, tenantId: 1, email: 'admin@easymk.mx', password: MOCK_PASSWORD, roles: ['ADMIN'] },
  {
    id: 2,
    tenantId: 1,
    email: 'ordenes@easymk.mx',
    password: MOCK_PASSWORD,
    roles: ['ORDERS_MANAGER'],
  },
];

export const MOCK_PLATFORM_ADMINS: MockPlatformAdmin[] = [
  { id: 1, email: 'staff@easymk.mx', password: MOCK_PASSWORD },
];

export const MOCK_TENANTS: TenantResponse[] = [
  { id: 1, name: 'Hogar Feliz', legalName: 'Hogar Feliz SA de CV', rfc: 'HFE010101AB1', status: 'ACTIVE' },
];

export const MOCK_ACCOUNTS: (AccountSummary & { tenantId: number })[] = [
  {
    id: 1,
    tenantId: 1,
    sellerId: '10001234',
    market: 'MX',
    status: 'ACTIVE',
    clientIdHint: '****9f3a',
  },
];
