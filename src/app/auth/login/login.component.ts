import { Component, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { errorMessage } from '../../core/http-helpers';
import { MOCK_PASSWORD } from '../../core/mock/mock-data';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from the route's data: sellers use /login, EasyMK staff /platform/login. */
  readonly mode = input<'tenant' | 'platform'>('tenant');
  readonly isPlatform = computed(() => this.mode() === 'platform');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly demoAccounts = environment.useMocks
    ? computed(() =>
        this.isPlatform()
          ? [{ email: 'staff@easymk.mx', role: 'Staff de plataforma' }]
          : [
              { email: 'admin@easymk.mx', role: 'Administrador' },
              { email: 'ordenes@easymk.mx', role: 'Órdenes (sin acceso)' },
            ],
      )
    : computed(() => []);
  readonly demoPassword = MOCK_PASSWORD;

  useDemo(email: string): void {
    this.form.setValue({ email, password: MOCK_PASSWORD });
  }

  onSubmit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const request: Observable<void> = this.isPlatform()
      ? this.authService.platformLogin(email, password)
      : this.authService.login(email, password);

    this.submitting.set(true);
    request.subscribe({
      next: () => {
        this.submitting.set(false);
        // Seller configuration is ADMIN-only on the backend; don't keep a session that can't use it.
        if (!this.isPlatform() && !this.authService.hasRole('ADMIN')) {
          this.authService.logout();
          this.error.set('Tu usuario no tiene permisos de administrador. Usa EasyMK para tu trabajo diario.');
          return;
        }
        this.router.navigateByUrl(this.isPlatform() ? '/platform' : '/');
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(
          errorMessage(err).startsWith('Tu sesión')
            ? 'Correo o contraseña incorrectos.'
            : errorMessage(err),
        );
      },
    });
  }
}
