import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroupDirective,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RoleCode } from '../core/api.models';
import { ROLES } from '../core/catalogs';
import { errorMessage } from '../core/http-helpers';
import { InvitationResultComponent } from '../shared/invitation-result.component';
import { invitationLink } from '../core/invitation-link';
import { TenantInvitationsService } from './configuration.services';

interface SentInvitation {
  email: string;
  name: string;
  roles: RoleCode[];
  link: string;
  sentAt: Date;
}

function atLeastOneRole(control: AbstractControl): ValidationErrors | null {
  const roles = control.value as Record<RoleCode, boolean>;
  return Object.values(roles).some(Boolean) ? null : { noRole: true };
}

@Component({
  selector: 'app-users-panel',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    InvitationResultComponent,
  ],
  template: `
    <div class="grid">
      <section class="emk-card">
        <div class="emk-card-header">
          <div>
            <h2>Invitar usuario</h2>
            <p class="hint">El usuario recibe un enlace para definir su contraseña y entrar.</p>
          </div>
        </div>
        <form class="emk-card-body invite-form" [formGroup]="form" (ngSubmit)="invite(formDir)" #formDir="ngForm">
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
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-error>Ingresa un correo válido</mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Teléfono (opcional)</mat-label>
              <input matInput type="tel" formControlName="phone" />
            </mat-form-field>
          </div>

          <fieldset formGroupName="roles" class="roles">
            <legend>Roles</legend>
            @for (role of roles; track role.code) {
              <mat-checkbox [formControlName]="role.code">
                <strong>{{ role.label }}</strong>
                <span class="role-desc">{{ role.description }}</span>
              </mat-checkbox>
            }
            @if (form.controls.roles.hasError('noRole') && form.controls.roles.touched) {
              <p class="role-error">Selecciona al menos un rol.</p>
            }
          </fieldset>

          @if (error()) {
            <p class="form-error" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p>
          }
          @if (last(); as last) {
            <app-invitation-result [email]="last.email" [link]="last.link" />
          }

          <div class="submit-row">
            <button mat-flat-button class="emk-gradient-button" type="submit" [disabled]="saving()">
              <mat-icon>send</mat-icon> Crear invitación
            </button>
          </div>
        </form>
      </section>

      <section class="emk-card">
        <div class="emk-card-header">
          <div>
            <h2>Invitaciones de esta sesión</h2>
            <p class="hint">La API no permite consultar usuarios ni invitaciones existentes.</p>
          </div>
        </div>
        @if (sent().length === 0) {
          <div class="emk-empty">
            <mat-icon class="empty-icon">group_add</mat-icon>
            <p class="empty-state">Aún no has enviado invitaciones.</p>
          </div>
        } @else {
          <ul class="sent">
            @for (item of sent(); track item.link) {
              <li>
                <div>
                  <strong>{{ item.name }}</strong>
                  <span class="muted">{{ item.email }} · {{ roleLabels(item.roles) }}</span>
                </div>
                <span class="muted">{{ item.sentAt | date: 'HH:mm' }}</span>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 20px; align-items: start; }
    .grid .emk-card { margin: 0; }
    .hint { margin: 4px 0 0; font-size: 0.85rem; color: var(--emk-text-muted); }
    .row { display: flex; gap: 12px; }
    .row mat-form-field { flex: 1; }
    .roles { display: flex; flex-direction: column; gap: 4px; margin: 0 0 16px; padding: 12px 16px;
      border: 1px solid var(--emk-border); border-radius: var(--emk-radius-sm); }
    .roles legend { padding: 0 6px; font-size: 0.85rem; font-weight: 600; }
    .role-desc { display: block; font-size: 0.8rem; color: var(--emk-text-muted); }
    .role-error { margin: 4px 0 0; font-size: 0.8rem; color: var(--emk-status-cancelled-fg); }
    .submit-row { display: flex; justify-content: flex-end; margin-top: 12px; }
    .sent { list-style: none; margin: 0; padding: 0; }
    .sent li { display: flex; justify-content: space-between; gap: 12px; padding: 12px 20px;
      border-top: 1px solid var(--emk-border); }
    .sent li:first-child { border-top: none; }
    .muted { display: block; font-size: 0.8rem; color: var(--emk-text-muted); }
    @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class UsersPanelComponent {
  private readonly service = inject(TenantInvitationsService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly roles = ROLES;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly last = signal<SentInvitation | null>(null);
  readonly sent = signal<SentInvitation[]>([]);

  readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    roles: this.fb.group(
      { ADMIN: [false], ORDERS_MANAGER: [true], CATALOG_MANAGER: [false] },
      { validators: atLeastOneRole },
    ),
  });

  roleLabels(codes: RoleCode[]): string {
    return codes.map((c) => ROLES.find((r) => r.code === c)?.label ?? c).join(', ');
  }

  invite(formDir: FormGroupDirective): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const roles = (Object.keys(value.roles) as RoleCode[]).filter((code) => value.roles[code]);
    this.saving.set(true);
    this.service
      .invite({
        email: value.email.trim(),
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phone: value.phone.trim() || null,
        roles,
      })
      .subscribe({
        next: (response) => {
          const invitation: SentInvitation = {
            email: value.email.trim(),
            name: `${value.firstName} ${value.lastName}`.trim(),
            roles,
            link: invitationLink(response.token),
            sentAt: new Date(),
          };
          this.last.set(invitation);
          this.sent.update((list) => [invitation, ...list]);
          this.saving.set(false);
          // Back to the initial values, clearing the submitted/touched error state.
          formDir.resetForm();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(errorMessage(err));
        },
      });
  }
}
