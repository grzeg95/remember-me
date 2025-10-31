import {
  ApplicationConfig, inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import {provideRouter} from '@angular/router';
import {routes} from './views/app.routes';
import {provideFirebase} from './config/firebase';
import {Theme} from './services/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideFirebase(),
    provideAppInitializer(() => {

      const theme = inject(Theme);

      const isLocalStorageDarkMode = localStorage.getItem('isDarkMode');
      const isMediaDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

      if (isLocalStorageDarkMode !== null) {
        theme.setTheme(isLocalStorageDarkMode === 'true');
      } else {
        theme.setTheme(isMediaDarkMode);
      }
    })
  ]
};
