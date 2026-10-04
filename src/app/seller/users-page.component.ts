import { Component } from '@angular/core';
import { UsersPanelComponent } from './users-panel.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [UsersPanelComponent],
  template: `
    <header class="emk-page-header">
      <div>
        <h1>Usuarios</h1>
        <p>Invita a las personas de tu equipo y define qué pueden hacer en EasyMK.</p>
      </div>
    </header>
    <app-users-panel />
  `,
})
export class UsersPageComponent {}
