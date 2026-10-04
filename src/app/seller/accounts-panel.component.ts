import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AccountSummary } from '../core/api.models';
import { ACCOUNT_STATUS_LABELS, MARKETS } from '../core/catalogs';
import { errorMessage } from '../core/http-helpers';
import { AccountDialogComponent, AccountDialogData } from './account-dialog.component';
import { MarketplaceAccountsService } from './configuration.services';

@Component({
  selector: 'app-accounts-panel',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
    <section class="emk-card">
      <div class="emk-card-header">
        <div>
          <h2>Cuentas de Walmart</h2>
          <p class="hint">Cuentas de seller conectadas a EasyMK. Las órdenes llegan de las cuentas activas.</p>
        </div>
        <button mat-flat-button class="emk-gradient-button" type="button" (click)="connect()">
          <mat-icon>add_link</mat-icon> Conectar cuenta
        </button>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      @if (error()) {
        <div class="emk-empty">
          <mat-icon class="empty-icon error">cloud_off</mat-icon>
          <p class="empty-state">{{ error() }}</p>
          <button mat-stroked-button type="button" (click)="load()">Reintentar</button>
        </div>
      } @else if (accounts().length > 0) {
        <div class="emk-table-scroll">
          <table mat-table [dataSource]="accounts()" class="emk-table">
            <ng-container matColumnDef="sellerId">
              <th mat-header-cell *matHeaderCellDef>Seller ID</th>
              <td mat-cell *matCellDef="let a" class="emk-num strong">{{ a.sellerId }}</td>
            </ng-container>
            <ng-container matColumnDef="market">
              <th mat-header-cell *matHeaderCellDef>Mercado</th>
              <td mat-cell *matCellDef="let a">{{ marketLabel(a.market) }}</td>
            </ng-container>
            <ng-container matColumnDef="clientIdHint">
              <th mat-header-cell *matHeaderCellDef>Client ID</th>
              <td mat-cell *matCellDef="let a" class="emk-num">{{ a.clientIdHint }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estatus</th>
              <td mat-cell *matCellDef="let a">
                <mat-slide-toggle
                  [checked]="a.status === 'ACTIVE'"
                  [disabled]="busyId() === a.id"
                  (change)="toggle(a, $event)"
                >
                  {{ statusLabels[a.status] }}
                </mat-slide-toggle>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let a" class="end">
                <button mat-button type="button" (click)="rotate(a)">
                  <mat-icon>key</mat-icon> Credenciales
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>
      } @else if (!loading()) {
        <div class="emk-empty">
          <mat-icon class="empty-icon">link_off</mat-icon>
          <p class="empty-state">Aún no hay cuentas de Walmart conectadas.</p>
        </div>
      }
    </section>
  `,
  styles: `
    .hint { margin: 4px 0 0; font-size: 0.85rem; color: var(--emk-text-muted); }
    .strong { font-weight: 600; }
    .end { text-align: right; }
  `,
})
export class AccountsPanelComponent {
  private readonly service = inject(MarketplaceAccountsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['sellerId', 'market', 'clientIdHint', 'status', 'actions'];
  readonly statusLabels: Record<string, string> = ACCOUNT_STATUS_LABELS;
  readonly accounts = signal<AccountSummary[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  constructor() {
    this.load();
  }

  marketLabel(code: string): string {
    return MARKETS.find((m) => m.code === code)?.label ?? code;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(errorMessage(err, 'No se pudieron cargar las cuentas.'));
        this.loading.set(false);
      },
    });
  }

  connect(): void {
    this.openDialog({}, 'Cuenta conectada.');
  }

  rotate(account: AccountSummary): void {
    this.openDialog({ account }, 'Credenciales actualizadas.');
  }

  toggle(account: AccountSummary, change: MatSlideToggleChange): void {
    this.busyId.set(account.id);
    this.service.changeStatus(account.id, change.checked ? 'ACTIVE' : 'INACTIVE').subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busyId.set(null);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        // The bound value never changed, so put the toggle back by hand.
        change.source.checked = !change.checked;
        this.snackBar.open(errorMessage(err), 'Cerrar', { duration: 4000 });
      },
    });
  }

  private openDialog(data: AccountDialogData, success: string): void {
    this.dialog
      .open<AccountDialogComponent, AccountDialogData, AccountSummary>(AccountDialogComponent, {
        data,
        width: '520px',
        panelClass: 'emk-dialog',
      })
      .afterClosed()
      .subscribe((account) => {
        if (!account) return;
        if (this.accounts().some((a) => a.id === account.id)) {
          this.replace(account);
        } else {
          this.accounts.update((list) => [...list, account]);
        }
        this.snackBar.open(success, 'Cerrar', { duration: 3000 });
      });
  }

  private replace(account: AccountSummary): void {
    this.accounts.update((list) => list.map((a) => (a.id === account.id ? account : a)));
  }
}
