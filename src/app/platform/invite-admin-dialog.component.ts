import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TenantResponse } from '../core/api.models';
import { errorMessage } from '../core/http-helpers';
import { invitationLink } from '../core/invitation-link';
import { InvitationResultComponent } from '../shared/invitation-result.component';
import { PlatformService } from './platform.service';

@Component({
  selector: 'app-invite-admin-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    InvitationResultComponent,
  ],
  template: `
    <h2 mat-dialog-title>Invitar administrador</h2>
    <mat-dialog-content>
      <p class="intro">
        Primer administrador de <strong>{{ tenant.name }}</strong>. Recibirá acceso total a la cuenta
        del seller.
      </p>
      @if (result(); as result) {
        <app-invitation-result [email]="result.email" [link]="result.link" />
      } @else {
        <form class="emk-dialog-form" id="invite-admin-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="firstName" />
              <mat-error>Requerido</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Apellidos</mat-label>
              <input matInput formControlName="lastName" />
              <mat-error>Requerido</mat-error>
            </mat-form-field>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>Correo electrónico</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error>Ingresa un correo válido</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Teléfono (opcional)</mat-label>
            <input matInput type="tel" formControlName="phone" />
          </mat-form-field>
        </form>
      }
      @if (error()) {
        <p class="form-error" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">{{ result() ? 'Listo' : 'Cancelar' }}</button>
      @if (!result()) {
        <button
          mat-flat-button
          class="emk-gradient-button"
          type="submit"
          form="invite-admin-form"
          [disabled]="saving()"
        >
          Crear invitación
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `.intro { margin-top: 0; color: var(--emk-text-muted); }`,
})
export class InviteAdminDialogComponent {
  readonly tenant = inject<TenantResponse>(MAT_DIALOG_DATA);
  private readonly platform = inject(PlatformService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<{ email: string; link: string } | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.platform
      .inviteFirstAdmin(this.tenant.id, {
        email: value.email.trim(),
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phone: value.phone.trim() || null,
      })
      .subscribe({
        next: (response) => {
          this.saving.set(false);
          this.result.set({ email: value.email.trim(), link: invitationLink(response.token) });
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(errorMessage(err));
        },
      });
  }
}
