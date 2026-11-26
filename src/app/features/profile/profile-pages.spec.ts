import { Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ProfileService, ProfileSession, UserProfile } from '../../core/services/profile.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { ProfileActivityPageComponent } from './pages/activity/profile-activity-page.component';
import { ProfileOverviewPageComponent } from './pages/overview/profile-overview-page.component';
import { ProfilePreferencesPageComponent } from './pages/preferences/profile-preferences-page.component';
import { ProfileShellComponent } from './pages/profile-shell/profile-shell.component';
import { ProfileSecurityPageComponent, passwordRules } from './pages/security/profile-security-page.component';
import { ProfileSessionsPageComponent, sessionStatusLabel } from './pages/sessions/profile-sessions-page.component';

const toast = { success: () => undefined, error: () => undefined, info: () => undefined };

const PROFILE = {
  id: 'me',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: null,
  avatarUrl: null,
  status: 'PENDING_VERIFICATION',
  mfaEnabled: false,
  emailVerifiedAt: null,
  lastLoginAt: null,
  passwordChangedAt: null,
  roles: ['HR_ADMIN'],
  permissions: [],
  employee: null,
  preferences: {},
} as unknown as UserProfile;

const session = (id: string, over: Partial<ProfileSession> = {}): ProfileSession => ({
  id,
  status: 'ACTIVE',
  current: false,
  active: true,
  deviceLabel: `Device ${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-02-01T00:00:00.000Z',
  ...over,
});

async function render<T>(component: Type<T>, providers: unknown[]) {
  TestBed.configureTestingModule({ imports: [component], providers: providers as never[] });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(component);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

const profileService = (over: Record<string, unknown> = {}) => ({
  provide: ProfileService,
  useValue: {
    getProfile: () => of(PROFILE),
    formatDateTime: () => 'Jan 1, 2026',
    relativeTime: () => '2 days ago',
    statusTone: (s: string) => (s === 'ACTIVE' ? 'success' : 'pending'),
    ...over,
  },
});

describe('password rules', () => {
  const group = (current: string, next: string, confirm: string) =>
    ({ get: (name: string) => ({ value: { currentPassword: current, newPassword: next, confirmPassword: confirm }[name] }) }) as never;

  it('flags a confirmation that does not repeat the new password', () => {
    expect(passwordRules(group('old', 'New-pass-1', 'New-pass-2'))).toEqual({ mismatch: true });
    expect(passwordRules(group('old', 'New-pass-1', 'New-pass-1'))).toBeNull();
    expect(passwordRules(group('old', 'New-pass-1', ''))).toBeNull();
  });

  it('flags a new password that is the same as the current one', () => {
    expect(passwordRules(group('same-1A', 'same-1A', 'same-1A'))).toEqual({ sameAsCurrent: true });
  });
});

describe('ProfileSecurityPageComponent', () => {
  async function setup() {
    const changes: Array<Record<string, unknown>> = [];
    const result = await render(ProfileSecurityPageComponent, [
      provideRouter([]),
      { provide: ToastService, useValue: toast },
      profileService({
        changePassword: (body: Record<string, unknown>) => {
          changes.push(body);
          return of({ otherSessionsRevoked: 2 });
        },
      }),
    ]);
    return { ...result, changes };
  }

  it('says so as soon as the confirmation does not match, and does not submit', async () => {
    const { fixture, component, el, changes } = await setup();
    component.form.setValue({ currentPassword: 'Old-pass-1', newPassword: 'New-pass-1', confirmPassword: 'New-pass-2' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('do not match');
    component.changePassword();
    expect(changes.length).toBe(0);
  });

  it('refuses to reuse the current password', async () => {
    const { fixture, component, el, changes } = await setup();
    component.form.setValue({ currentPassword: 'Same-pass-1', newPassword: 'Same-pass-1', confirmPassword: 'Same-pass-1' });
    fixture.detectChanges();
    expect(el.textContent).toContain('different from your current one');
    component.changePassword();
    expect(changes.length).toBe(0);
  });

  it('changes the password when everything is valid and clears the form', async () => {
    const { fixture, component, el, changes } = await setup();
    component.form.setValue({ currentPassword: 'Old-pass-1', newPassword: 'New-pass-1', confirmPassword: 'New-pass-1' });
    fixture.detectChanges();
    expect(el.textContent).toContain('The passwords match');
    component.changePassword();
    expect(changes).toEqual([{ currentPassword: 'Old-pass-1', newPassword: 'New-pass-1' }]);
    expect(component.form.getRawValue().newPassword).toBe('');
  });

  it('shows and hides a password field on request', async () => {
    const { fixture, component, el } = await setup();
    const input = () => el.querySelector<HTMLInputElement>('input[formControlName="newPassword"]')!;
    expect(input().type).toBe('password');
    component.toggle('next');
    fixture.detectChanges();
    expect(input().type).toBe('text');
  });
});

describe('ProfileSessionsPageComponent', () => {
  async function setup(items: ProfileSession[]) {
    return render(ProfileSessionsPageComponent, [
      { provide: ToastService, useValue: toast },
      { provide: ConfirmDialogService, useValue: { open: () => of(true) } },
      profileService({ listSessions: () => of({ items }) }),
    ]);
  }

  it('lists this device first, then other active devices, then ended sessions', async () => {
    const { component } = await setup([
      session('old', { status: 'EXPIRED', active: false, createdAt: '2026-03-01T00:00:00.000Z' }),
      session('other', { createdAt: '2026-02-01T00:00:00.000Z' }),
      session('mine', { current: true, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    expect(component.sessions().map((s) => s.id)).toEqual(['mine', 'other', 'old']);
  });

  it('only offers to sign out other devices when there are some', async () => {
    const none = await setup([session('mine', { current: true })]);
    const button = () =>
      Array.from(none.el.querySelectorAll<HTMLButtonElement>('button')).find((b) => /Sign out other devices/.test(b.textContent ?? ''))!;
    expect(button().disabled).toBe(true);

    TestBed.resetTestingModule();
    const some = await setup([session('mine', { current: true }), session('phone')]);
    const enabled = Array.from(some.el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      /Sign out other devices/.test(b.textContent ?? ''),
    )!;
    expect(enabled.disabled).toBe(false);
  });

  it('uses plain words for status and names the device on its sign-out button', async () => {
    const { el } = await setup([
      session('mine', { current: true }),
      session('phone', { deviceLabel: 'Pixel 8' }),
      session('gone', { status: 'REVOKED', active: false }),
    ]);
    expect(el.textContent).toContain('Signed out');
    expect(el.textContent).not.toContain('REVOKED');
    expect(el.querySelector('button[aria-label="Sign out Pixel 8"]')).toBeTruthy();
    expect(el.querySelector('.profile-current')?.textContent).toContain('This device');
    expect(sessionStatusLabel('EXPIRED')).toBe('Expired');
  });
});

describe('ProfileOverviewPageComponent', () => {
  async function setup() {
    const updates: Array<Record<string, unknown>> = [];
    const result = await render(ProfileOverviewPageComponent, [
      { provide: ToastService, useValue: toast },
      { provide: AuthService, useValue: { me: () => of(null) } },
      profileService({
        updateProfile: (body: Record<string, unknown>) => {
          updates.push(body);
          return of({ ...PROFILE, ...body });
        },
      }),
    ]);
    return { ...result, updates };
  }

  it('shows the status in words and no longer repeats email and roles', async () => {
    const { el } = await setup();
    expect(el.textContent).toContain('Pending verification');
    expect(el.textContent).not.toContain('PENDING_VERIFICATION');
    expect(el.textContent).toContain('Not verified');
    expect(el.textContent).toContain('Never');
  });

  it('does not save a phone number with letters in it', async () => {
    const { fixture, component, updates, el } = await setup();
    component.form.controls.phone.setValue('call me');
    component.form.markAsDirty();
    component.save();
    fixture.detectChanges();
    expect(updates.length).toBe(0);
    expect(el.textContent).toContain('Use digits and + ( ) - only');
  });

  it('shows the unsaved indicator, then saves trimmed values', async () => {
    const { fixture, component, el, updates } = await setup();
    expect(el.querySelector('.profile-dirty')).toBeNull();
    component.form.controls.firstName.setValue('  Augusta  ');
    component.form.markAsDirty();
    fixture.detectChanges();
    expect(el.querySelector('.profile-dirty')?.textContent).toContain('Unsaved changes');
    component.save();
    expect(updates[0]!['firstName']).toBe('Augusta');
  });

  it('previews only secure picture addresses', async () => {
    const { fixture, component } = await setup();
    component.form.controls.avatarUrl.setValue('http://example.com/a.png');
    fixture.detectChanges();
    expect(component.previewUrl()).toBeNull();
    component.form.controls.avatarUrl.setValue('https://example.com/a.png');
    fixture.detectChanges();
    expect(component.previewUrl()).toBe('https://example.com/a.png');
  });
});

describe('ProfilePreferencesPageComponent', () => {
  async function setup() {
    return render(ProfilePreferencesPageComponent, [
      { provide: ToastService, useValue: toast },
      { provide: ThemeService, useValue: { setMode: () => undefined } },
      profileService({
        getPreferences: () =>
          of({ theme: 'dark', locale: 'en-US', timezone: 'UTC', dateFormat: 'DD MMM YYYY', timeFormat: '24h', weekStartsOn: 1 }),
      }),
    ]);
  }

  it('is honest that only the theme takes effect', async () => {
    const { el } = await setup();
    expect(el.textContent).toContain('Applies as soon as you save');
    expect(el.textContent).toContain('does not change what you see yet');
    expect(el.textContent).not.toContain('upcoming theming support');
  });

  it('keeps Save off until something changes', async () => {
    const { fixture, component, el } = await setup();
    const save = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(save().disabled).toBe(true);
    component.form.controls.theme.setValue('light');
    component.form.markAsDirty();
    fixture.detectChanges();
    expect(save().disabled).toBe(false);
  });

  it('labels options with examples', async () => {
    const { component } = await setup();
    expect(component.timeFormatLabel('24h')).toContain('21:05');
    expect(component.dateFormatLabel('YYYY-MM-DD')).toMatch(/\(\d{4}-\d{2}-\d{2}\)/);
    expect(component.localeLabel('en-US')).toContain('en-US');
  });
});

describe('ProfileActivityPageComponent', () => {
  it('tells you when older events are not shown', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `e${i}`,
      action: 'profile.update',
      title: 'Profile updated',
      createdAt: '2026-01-01T00:00:00.000Z',
    }));
    const { el } = await render(ProfileActivityPageComponent, [profileService({ listActivity: () => of({ items }) })]);
    expect(el.textContent).toContain('Showing your 50 most recent events');
  });
});

describe('ProfileShellComponent', () => {
  it('shows who is signed in, with readable role names and initials when there is no picture', async () => {
    const { el } = await render(ProfileShellComponent, [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          user: signal({
            id: 'me',
            email: 'ada@example.com',
            firstName: 'Ada',
            lastName: 'Lovelace',
            roles: ['HR_ADMIN', 'SUPER_ADMIN'],
            permissions: [],
            avatarUrl: null,
          }),
        },
      },
    ]);
    expect(el.querySelector('.profile-identity strong')?.textContent).toBe('Ada Lovelace');
    expect(el.querySelector('.profile-identity__avatar')?.textContent?.trim()).toBe('AL');
    const roles = Array.from(el.querySelectorAll('.profile-identity__roles .profile-role-chip')).map((r) => r.textContent?.trim());
    expect(roles).toEqual(['HR Admin', 'Super Admin']);
  });
});
