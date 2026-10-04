import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { TenantResponse } from '../core/api.models';
import { TENANT_STATUS_LABELS } from '../core/catalogs';
import { errorMessage } from '../core/http-helpers';
import { InviteAdminDialogComponent } from './invite-admin-dialog.component';
import { PlatformService } from './platform.service';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
  ],
  template: `
    <header class="emk-page-header">
      <div>
        <h1>Sellers</h1>
        <p>Da de alta un seller y envía la invitación a su primer administrador.</p>
      </div>
    </header>

    <div class="grid">
      <section class="emk-card">
        <div class="emk-card-header"><h2>Nuevo seller</h2></div>
        <form class="emk-card-body" [formGroup]="form" (ngSubmit)="create(formDir)" #formDir="ngForm">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Nombre comercial</mat-label>
            <input matInput formControlName="name" />
            <mat-error>Requerido</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Razón social</mat-label>
            <input matInput formControlName="legalName" />
            <mat-error>Requerido</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>RFC</mat-label>
            <input matInput formControlName="rfc" maxlength="13" class="upper" />
            <mat-hint>12 caracteres para persona moral, 13 para persona física</mat-hint>
            <mat-error>El RFC debe tener 12 o 13 caracteres</mat-error>
          </mat-form-field>
          @if (error()) {
            <p class="form-error" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p>
          }
          <div class="submit-row">
            <button mat-flat-button class="emk-gradient-button" type="submit" [disabled]="saving()">
              <mat-icon>add_business</mat-icon> Crear seller
            </button>
          </div>
        </form>
      </section>

      <section class="emk-card">
        <div class="emk-card-header">
          <div>
            <h2>Creados en esta sesión</h2>
            <p class="hint">La API no permite consultar los sellers existentes.</p>
          </div>
        </div>
        @if (tenants().length === 0) {
          <div class="emk-empty">
            <mat-icon class="empty-icon">storefront</mat-icon>
            <p class="empty-state">Aún no has creado sellers.</p>
          </div>
        } @else {
          <table mat-table [dataSource]="tenants()" class="emk-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Seller</th>
              <td mat-cell *matCellDef="let t">
                <strong>{{ t.name }}</strong>
                <span class="muted">{{ t.legalName }} · {{ t.rfc }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estatus</th>
              <td mat-cell *matCellDef="let t">
                <span class="emk-chip" [class.status-pending]="t.status === 'PENDING_ACTIVATION'"
                  [class.status-delivered]="t.status === 'ACTIVE'"
                  [class.status-cancelled]="t.status === 'SUSPENDED'">
                  {{ statusLabels[t.status] }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let t" class="end">
                <button mat-button type="button" (click)="inviteAdmin(t)">
                  <mat-icon>person_add</mat-icon> Invitar admin
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        }
      </section>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 20px; align-items: start; }
    .grid .emk-card { margin: 0; }
    .full { width: 100%; }
    .upper input, input.upper { text-transform: uppercase; }
    .hint { margin: 4px 0 0; font-size: 0.85rem; color: var(--emk-text-muted); }
    .submit-row { display: flex; justify-content: flex-end; margin-top: 8px; }
    .muted { display: block; font-size: 0.8rem; color: var(--emk-text-muted); }
    .end { text-align: right; }
    @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class TenantsComponent {
  private readonly platform = inject(PlatformService);
  private readonly dialog = inject(MatDialog);

  readonly columns = ['name', 'status', 'actions'];
  readonly statusLabels: Record<string, string> = TENANT_STATUS_LABELS;
  readonly tenants = this.platform.createdTenants;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    legalName: ['', Validators.required],
    rfc: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(13)]],
  });

  create(formDir: FormGroupDirective): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.platform
      .createTenant({
        name: value.name.trim(),
        legalName: value.legalName.trim(),
        rfc: value.rfc.trim().toUpperCase(),
      })
      .subscribe({
        next: (tenant) => {
          this.saving.set(false);
          formDir.resetForm();
          this.inviteAdmin(tenant);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(errorMessage(err));
        },
      });
  }

  inviteAdmin(tenant: TenantResponse): void {
    this.dialog.open(InviteAdminDialogComponent, { data: tenant, width: '520px', panelClass: 'emk-dialog' });
  }
}
