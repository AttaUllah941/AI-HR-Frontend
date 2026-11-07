// this file is used to configure the application
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { DialogFocusService } from './core/services/dialog-focus.service';
import { ThemeService } from './core/services/theme.service';
import { AppPreloadingStrategy } from './core/routing/app-preloading.strategy';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { refreshInterceptor } from './core/interceptors/refresh.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Apply the saved light/dark choice before the first render.
    provideAppInitializer(() => inject(ThemeService).init()),
    provideAppInitializer(() => inject(DialogFocusService).start()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withPreloading(AppPreloadingStrategy),
      // Cross-fade between routes (Chromium/Safari 18+; others navigate normally). Skipped for reduced motion.
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            transition.skipTransition();
          }
        },
      }),
    ),
    // Order matters: refresh must wrap the HTTP call before error handles residual 401s.
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor, refreshInterceptor])),
    provideAnimationsAsync(),
  ],
};
