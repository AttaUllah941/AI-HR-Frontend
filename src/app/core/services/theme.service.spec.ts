import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { THEME_STORAGE_KEY, ThemeService, isThemeMode } from './theme.service';

describe('ThemeService', () => {
  const updatePreferences = vi.fn();
  const getPreferences = vi.fn();
  let authenticated = true;

  function create(): ThemeService {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } },
        { provide: ProfileService, useValue: { updatePreferences, getPreferences } },
      ],
    });
    return TestBed.inject(ThemeService);
  }

  beforeEach(() => {
    authenticated = true;
    updatePreferences.mockReset().mockReturnValue(of({}));
    getPreferences.mockReset().mockReturnValue(of({ theme: 'system' }));
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('validates theme modes', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('purple')).toBe(false);
  });

  it('defaults to system (no data-theme override)', () => {
    const theme = create();
    theme.init();
    expect(theme.mode()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('restores the cached mode before the profile loads', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    getPreferences.mockReturnValue(of({ theme: 'dark' }));
    const theme = create();
    theme.init();
    expect(theme.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('setMode applies, caches and saves to the profile', () => {
    const theme = create();
    theme.setMode('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(updatePreferences).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('switching back to system clears the override', () => {
    const theme = create();
    theme.setMode('dark');
    theme.setMode('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('does not call the API when signed out (localStorage only)', () => {
    authenticated = false;
    const theme = create();
    theme.setMode('light');
    expect(updatePreferences).not.toHaveBeenCalled();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('keeps the local choice when saving to the profile fails', () => {
    updatePreferences.mockReturnValue(throwError(() => new Error('offline')));
    const theme = create();
    theme.setMode('dark');
    expect(theme.mode()).toBe('dark');
  });

  it('adopts the theme saved on the server', () => {
    getPreferences.mockReturnValue(of({ theme: 'dark' }));
    const theme = create();
    theme.init();
    expect(theme.mode()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });
});
