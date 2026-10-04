/**
 * Shapes of the EasyMK-Backend REST API (mx.com.easymp.*). Kept 1:1 with the
 * backend DTOs so the mock backend and the real one are interchangeable.
 */

// --- Auth ---------------------------------------------------------------

export type RoleCode = 'ADMIN' | 'ORDERS_MANAGER' | 'CATALOG_MANAGER';
export type Authority = RoleCode | 'PLATFORM_ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenResponse {
  accessToken: string;
}

// --- Marketplace accounts -------------------------------------------------

export type Market = 'MX' | 'US' | 'CA' | 'CL';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface AccountSummary {
  id: number;
  sellerId: string;
  market: Market;
  status: AccountStatus;
  clientIdHint: string;
}

export interface ConnectAccountRequest {
  sellerId: string;
  market: Market;
  clientId: string;
  clientSecret: string;
}

export interface RotateCredentialsRequest {
  clientId: string;
  clientSecret: string;
}

// --- Invitations ----------------------------------------------------------

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  roles: RoleCode[];
}

export interface InvitationResponse {
  invitationId: number;
  /** Raw token, returned only once by the API. */
  token: string;
}

// --- Platform -------------------------------------------------------------

export type TenantStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED';

export interface CreateTenantRequest {
  name: string;
  legalName: string;
  rfc: string;
}

export interface TenantResponse {
  id: number;
  name: string;
  legalName: string;
  rfc: string;
  status: TenantStatus;
}

export interface InviteFirstAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export interface CreatePlatformAdminRequest {
  email: string;
  password: string;
}

export interface PlatformAdminResponse {
  id: number;
  email: string;
}
