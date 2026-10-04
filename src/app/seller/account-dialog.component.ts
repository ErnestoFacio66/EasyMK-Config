import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { AccountSummary, Market } from '../core/api.models';
import { MARKETS } from '../core/catalogs';
import { errorMessage } from '../core/http-helpers';
import { MarketplaceAccountsService } from './configuration.services';

/** Without an account: connect a new one. With one: rotate its credentials. */
export interface AccountDialogData {
  account?: AccountSummary;
}

@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ rotating ? 'Actualizar credenciales' : 'Conectar cuenta de Walmart' }}</h2>
    <mat-dialog-content>
      <p class="intro">
        @if (rotating) {
          Seller <strong>{{ data.account!.sellerId }}</strong>. Las nuevas credenciales se validan con
          Walmart antes de guardarse.
        } @else {
          Usa el Client ID y Client Secret de tu cuenta en el Walmart Developer Portal. EasyMK los valida
          con Walmart y los guarda cifrados.
        }
      </p>
      <form class="emk-dialog-form" id="account-form" [formGroup]="form" (ngSubmit)="submit()">
        @if (!rotating) {
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Seller ID</mat-label>
              <input matInput formControlName="sellerId" />
              <mat-error>Requerido</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Mercado</mat-label>
              <mat-select formControlName="market">
                @for (market of markets; track market.code) {
                  <mat-option [value]="market.code">{{ market.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }
        <mat-form-field appearance="outline">
          <mat-label>Client ID</mat-label>
          <input matInput formControlName="clientId" autocomplete="off" />
          <mat-error>Requerido</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Client Secret</mat-label>
          <input matInput type="password" formControlName="clientSecret" autocomplete="new-password" />
          <mat-error>Requerido</mat-error>
        </mat-form-field>
      </form>
      @if (error()) {
        <p class="form-error" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button
        mat-flat-button
        class="emk-gradient-button"
        type="submit"
        form="account-form"
        [disabled]="saving()"
      >
        {{ saving() ? 'Validando con Walmart…' : rotating ? 'Guardar' : 'Conectar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `.intro { margin-top: 0; color: var(--emk-text-muted); }`,
})
export class AccountDialogComponent {
  readonly data = inject<AccountDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<AccountDialogComponent, AccountSummary>);
  private readonly accounts = inject(MarketplaceAccountsService);

  readonly rotating = !!this.data.account;
  readonly markets = MARKETS;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    sellerId: [{ value: '', disabled: this.rotating }, Validators.required],
    market: [{ value: 'MX' as Market, disabled: this.rotating }, Validators.required],
    clientId: ['', Validators.required],
    clientSecret: ['', Validators.required],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: Observable<AccountSummary> = this.data.account
      ? this.accounts.rotateCredentials(this.data.account.id, {
          clientId: value.clientId.trim(),
          clientSecret: value.clientSecret,
        })
      : this.accounts.connect({
          sellerId: value.sellerId.trim(),
          market: value.market,
          clientId: value.clientId.trim(),
          clientSecret: value.clientSecret,
        });

    this.saving.set(true);
    request.subscribe({
      next: (account) => this.ref.close(account),
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
