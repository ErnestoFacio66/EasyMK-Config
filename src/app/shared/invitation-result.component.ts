import { Component, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Shows the invitation link right after it is created. The backend returns
 * the token only once, so this is the only chance to copy it.
 */
@Component({
  selector: 'app-invitation-result',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="form-success">
      <mat-icon>mark_email_read</mat-icon>
      <div>
        Invitación creada para <strong>{{ email() }}</strong>. Comparte este enlace; solo se muestra
        una vez.
      </div>
    </div>
    <div class="emk-copy">
      <span>{{ link() }}</span>
      <button mat-icon-button type="button" (click)="copy()" [attr.aria-label]="'Copiar enlace'">
        <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
      </button>
    </div>
  `,
})
export class InvitationResultComponent {
  readonly email = input.required<string>();
  readonly link = input.required<string>();
  readonly copied = signal(false);

  copy(): void {
    navigator.clipboard?.writeText(this.link()).then(
      () => this.copied.set(true),
      () => this.copied.set(false),
    );
  }
}
