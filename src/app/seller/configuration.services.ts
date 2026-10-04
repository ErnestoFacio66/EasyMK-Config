import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AccountStatus,
  AccountSummary,
  ConnectAccountRequest,
  InvitationResponse,
  InviteUserRequest,
  RotateCredentialsRequest,
} from '../core/api.models';
import { apiUrl } from '../core/api-url';

/** Client for /marketplace-accounts (role ADMIN). */
@Injectable({ providedIn: 'root' })
export class MarketplaceAccountsService {
  private readonly http = inject(HttpClient);

  list(): Observable<AccountSummary[]> {
    return this.http.get<AccountSummary[]>(apiUrl('/marketplace-accounts'));
  }

  /** Walmart validates the credentials first; a rejection answers 422 and nothing is saved. */
  connect(request: ConnectAccountRequest): Observable<AccountSummary> {
    return this.http.post<AccountSummary>(apiUrl('/marketplace-accounts'), request);
  }

  rotateCredentials(id: number, request: RotateCredentialsRequest): Observable<AccountSummary> {
    return this.http.put<AccountSummary>(apiUrl(`/marketplace-accounts/${id}/credentials`), request);
  }

  changeStatus(id: number, status: AccountStatus): Observable<AccountSummary> {
    return this.http.patch<AccountSummary>(apiUrl(`/marketplace-accounts/${id}/status`), { status });
  }
}

/** Client for /tenant/invitations (role ADMIN). */
@Injectable({ providedIn: 'root' })
export class TenantInvitationsService {
  private readonly http = inject(HttpClient);

  invite(request: InviteUserRequest): Observable<InvitationResponse> {
    return this.http.post<InvitationResponse>(apiUrl('/tenant/invitations'), request);
  }
}
