import { Component } from '@angular/core';
import { AccountsPanelComponent } from './accounts-panel.component';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [AccountsPanelComponent],
  template: `
    <header class="emk-page-header">
      <div>
        <h1>Cuentas Walmart</h1>
        <p>Conecta tus cuentas de seller de Walmart y administra sus credenciales.</p>
      </div>
    </header>
    <app-accounts-panel />
  `,
})
export class AccountsPageComponent {}
