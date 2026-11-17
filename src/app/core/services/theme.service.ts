import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'zh_theme';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Light / dark / system theme.
 * - `system` removes the `data-theme` override so CSS `prefers-color-scheme` decides.
 * - The choice is cached in localStorage (works signed out, applied before the first render)
 *   and saved to the user's profile preferences when signed in.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);

  readonly mode = signal<ThemeMode>(readStoredMode());

  constructor() {
    effect(() => this.applyToDocument(this.mode()));
  }

  /** Called at startup: applies the cached mode now, then reconciles with the saved profile. */
  init(): void {
    this.applyToDocument(this.mode());
    if (this.auth.isAuthenticated()) {
      this.syncFromProfile();
    }
  }

  setMode(mode: ThemeMode, options: { persist?: boolean } = {}): void {
    this.mode.set(mode);
    this.applyToDocument(mode);
    this.store(mode);

    if (options.persist !== false && this.auth.isAuthenticated()) {
      // Best effort: the local choice already applies, so a failed save is not surfaced.
      this.profile.updatePreferences({ theme: mode }).subscribe({ error: () => undefined });
    }
  }

  /** Adopts the theme saved on the server (e.g. chosen on another device). */
  syncFromProfile(): void {
    this.profile.getPreferences().subscribe({
      next: (prefs) => {
        if (isThemeMode(prefs.theme) && prefs.theme !== this.mode()) {
          this.mode.set(prefs.theme);
          this.applyToDocument(prefs.theme);
          this.store(prefs.theme);
        }
      },
      error: () => undefined,
    });
  }

  private applyToDocument(mode: ThemeMode): void {
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }
  }

  private store(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable (private mode): the in-memory choice still applies for this session.
    }
  }
}
