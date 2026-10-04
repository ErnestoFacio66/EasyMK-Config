import {
  APP_INITIALIZER,
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatIconRegistry } from '@angular/material/icon';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { mockBackendInterceptor } from './core/mock/mock-backend.interceptor';

registerLocaleData(localeEsMx);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    // The mock backend runs last so it sees the Authorization header like the real API would.
    provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    // Render <mat-icon> ligatures with the Material Symbols Rounded font.
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const icons = inject(MatIconRegistry);
        return () => icons.setDefaultFontSetClass('material-symbols-rounded');
      },
    },
  ],
};
