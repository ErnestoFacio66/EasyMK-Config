import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  CreatePlatformAdminRequest,
  CreateTenantRequest,
  InvitationResponse,
  InviteFirstAdminRequest,
  PlatformAdminResponse,
  TenantResponse,
} from '../core/api.models';
import { apiUrl } from '../core/api-url';

/** Client for the staff-only /platform API (authority PLATFORM_ADMIN). */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);

  /**
   * Sellers created in this browser session. The API has no list endpoint,
   * so this is what lets staff come back to a seller to (re)invite its admin.
   */
  readonly createdTenants = signal<TenantResponse[]>([]);

  createTenant(request: CreateTenantRequest): Observable<TenantResponse> {
    return this.http
      .post<TenantResponse>(apiUrl('/platform/tenants'), request)
      .pipe(tap((tenant) => this.createdTenants.update((list) => [tenant, ...list])));
  }

  inviteFirstAdmin(tenantId: number, request: InviteFirstAdminRequest): Observable<InvitationResponse> {
    return this.http.post<InvitationResponse>(apiUrl(`/platform/tenants/${tenantId}/invitations`), request);
  }

  createAdmin(request: CreatePlatformAdminRequest): Observable<PlatformAdminResponse> {
    return this.http.post<PlatformAdminResponse>(apiUrl('/platform/admins'), request);
  }
}
