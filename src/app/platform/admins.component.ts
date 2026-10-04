import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PlatformAdminResponse } from '../core/api.models';
import { errorMessage } from '../core/http-helpers';
import { PlatformService } from './platform.service';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <header class="emk-page-header">
      <div>
        <h1>Administradores</h1>
        <p>Agrega a otra persona del equipo de EasyMK como administrador de plataforma.</p>
      </div>
    </header>

    <section class="emk-card narrow">
      <div class="emk-card-header"><h2>Nuevo administrador de plataforma</h2></div>
      <form class="emk-card-body" [formGroup]="form" (ngSubmit)="create(formDir)" #formDir="ngForm">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="off" />
          <mat-error>Ingresa un correo válido</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Contraseña inicial</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>Mínimo 8 caracteres. Compártela por un canal seguro.</mat-hint>
          <mat-error>Debe tener al menos 8 caracteres</mat-error>
        </mat-form-field>
        @if (error()) {
          <p class="form-error" role="alert"><mat-icon>error</mat-icon> {{ error() }}</p>
        }
        @if (created(); as admin) {
          <p class="form-success">
            <mat-icon>check_circle</mat-icon>
            {{ admin.email }} ya puede entrar en el acceso de plataforma.
          </p>
        }
        <div class="submit-row">
          <button mat-flat-button class="emk-gradient-button" type="submit" [disabled]="saving()">
            <mat-icon>person_add</mat-icon> Crear administrador
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .narrow { max-width: 560px; }
    .full { width: 100%; }
    .submit-row { display: flex; justify-content: flex-end; margin-top: 12px; }
  `,
})
export class AdminsComponent {
  private readonly platform = inject(PlatformService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly created = signal<PlatformAdminResponse | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  create(formDir: FormGroupDirective): void {
    this.error.set(null);
    this.created.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.platform.createAdmin({ email: value.email.trim(), password: value.password }).subscribe({
      next: (admin) => {
        this.saving.set(false);
        this.created.set(admin);
        formDir.resetForm();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
