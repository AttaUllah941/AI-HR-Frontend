import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { SecurityService } from '../../core/services/security.service';
import { SettingsService, SettingsUser } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsCompanyPageComponent } from './pages/company/settings-company-page.component';
import { SettingsRolesPageComponent } from './pages/roles/settings-roles-page.component';
import { SettingsSecurityPageComponent } from './pages/security/settings-security-page.component';
import { SettingsUsersPageComponent } from './pages/users/settings-users-page.component';
import { emailProviderLabel, userStatusLabel, userStatusTone } from './utils/labels';

const toast = { success: () => undefined, error: () => undefined, info: () => undefined };
const pagination = (total: number) => ({ page: 1, pageSize: 25, total, totalPages: 1 });

const user = (id: string, status = 'ACTIVE', extra: Partial<SettingsUser> = {}): SettingsUser =>
  ({
    id,
    email: `${id}@example.com`,
    firstName: id.toUpperCase(),
    lastName: 'Person',
    status,
    mfaEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    roles: [{ id: 'r1', code: 'HR_ADMIN', name: 'HR Admin' }],
    ...extra,
  }) as SettingsUser;

async function render<T>(component: Type<T>, providers: unknown[]) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: providers as never[],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(component);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('settings labels', () => {
  it('uses plain words for statuses and providers', () => {
    expect(userStatusLabel('PENDING_VERIFICATION')).toBe('Pending verification');
    expect(userStatusLabel('ACTIVE')).toBe('Active');
    expect(userStatusLabel(null)).toBe('—');
    expect(userStatusTone('ACTIVE')).toBe('ok');
    expect(userStatusTone('SUSPENDED')).toBe('fail');
    expect(userStatusTone('INACTIVE')).toBe('warn');
    expect(emailProviderLabel('console')).toContain('Not delivering');
    expect(emailProviderLabel('smtp')).toBe('SMTP');
  });
});

describe('SettingsUsersPageComponent', () => {
  async function setup(items: SettingsUser[]) {
    const deleted: string[] = [];
    const calls: Array<Record<string, unknown>> = [];
    const result = await render(SettingsUsersPageComponent, [
      { provide: AuthService, useValue: { hasPermission: () => true, user: () => ({ id: 'me' }) } },
      { provide: ToastService, useValue: toast },
      { provide: ConfirmDialogService, useValue: { open: () => of(true) } },
      {
        provide: SettingsService,
        useValue: {
          listUsers: (params: Record<string, unknown>) => {
            calls.push(params);
            const search = String(params['search'] ?? '');
            const rows = search ? [] : items;
            return of({ items: rows, pagination: pagination(rows.length) });
          },
          listRoles: () => of({ items: [] }),
          deleteUser: (id: string) => {
            deleted.push(id);
            return of({});
          },
          formatDateTime: () => 'Jan 1, 2026',
        },
      },
    ]);
    return { ...result, deleted, calls };
  }

  it('shows role names and readable statuses, and marks your own account', async () => {
    const { el } = await setup([user('me'), user('bob', 'PENDING_VERIFICATION')]);
    expect(el.textContent).toContain('HR Admin');
    expect(el.textContent).not.toContain('HR_ADMIN');
    expect(el.textContent).toContain('Pending verification');
    expect(el.textContent).not.toContain('PENDING_VERIFICATION');
    expect(el.querySelectorAll('.settings-you').length).toBe(1);
  });

  it('never offers to delete your own account', async () => {
    const { el } = await setup([user('me'), user('bob')]);
    const labels = Array.from(el.querySelectorAll('button')).map((b) => b.getAttribute('aria-label') ?? '');
    expect(labels).toContain('Delete BOB Person');
    expect(labels).not.toContain('Delete ME Person');
  });

  it('deletes another user after confirmation', async () => {
    const { el, deleted, fixture } = await setup([user('me'), user('bob')]);
    el.querySelector<HTMLButtonElement>('button[aria-label="Delete BOB Person"]')!.click();
    fixture.detectChanges();
    expect(deleted).toEqual(['bob']);
  });

  it('keeps the search box on screen when a search finds nothing', async () => {
    const { fixture, component, el, calls } = await setup([user('me')]);
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    component.search.setValue('zzz');
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();
    expect(calls[calls.length - 1]!['search']).toBe('zzz');
    expect(el.querySelector('input[type="search"]')).toBe(input);
    expect(el.textContent).toContain('No matching users');
  });
});

describe('SettingsRolesPageComponent', () => {
  it('is a read-only view with no way to edit permissions', async () => {
    const { el } = await render(SettingsRolesPageComponent, [
      {
        provide: SettingsService,
        useValue: {
          listRoles: () =>
            of({
              items: [
                {
                  id: 'r1',
                  code: 'HR_ADMIN',
                  name: 'HR Admin',
                  description: null,
                  userCount: 2,
                  permissions: [{ id: 'p1', code: 'employees:view', module: 'employees', action: 'VIEW' }],
                },
              ],
            }),
          listPermissions: () =>
            of({
              items: [
                { id: 'p1', code: 'employees:view', module: 'employees', action: 'VIEW' },
                { id: 'p2', code: 'employees:delete', module: 'employees', action: 'DELETE' },
              ],
            }),
        },
      },
    ]);
    expect(el.querySelector('mat-checkbox')).toBeNull();
    expect(Array.from(el.querySelectorAll('button')).some((b) => /save/i.test(b.textContent ?? ''))).toBe(false);
    expect(el.textContent).toContain('read-only');
    expect(el.textContent).toContain('1 of 2');
    expect(el.querySelectorAll('.settings-perm-chip.is-granted').length).toBe(1);
  });
});

describe('SettingsCompanyPageComponent', () => {
  async function setup(confirmResult: boolean) {
    const updates: Array<Record<string, unknown>> = [];
    const confirmed: string[] = [];
    const result = await render(SettingsCompanyPageComponent, [
      { provide: AuthService, useValue: { hasPermission: () => true } },
      { provide: ToastService, useValue: toast },
      {
        provide: ConfirmDialogService,
        useValue: {
          open: (opts: { title: string }) => {
            confirmed.push(opts.title);
            return of(confirmResult);
          },
        },
      },
      {
        provide: SettingsService,
        useValue: {
          getCompany: () =>
            of({ name: 'Acme', timezone: 'UTC', locale: 'en-US', isActive: true, legalName: null, email: null, phone: null, website: null, logoUrl: null }),
          updateCompany: (body: Record<string, unknown>) => {
            updates.push(body);
            return of({});
          },
        },
      },
    ]);
    return { ...result, updates, confirmed };
  }

  it('does not save a timezone that does not exist', async () => {
    const { fixture, component, updates, el } = await setup(true);
    component.form.controls.timezone.setValue('Asia/Karachii');
    component.form.markAsDirty();
    component.save();
    fixture.detectChanges();
    expect(updates.length).toBe(0);
    expect(el.textContent).toContain('Not a known timezone');
  });

  it('asks before deactivating the company, and saves only when confirmed', async () => {
    const yes = await setup(true);
    yes.component.form.controls.isActive.setValue(false);
    yes.component.save();
    expect(yes.confirmed).toEqual(['Deactivate this company?']);
    expect(yes.updates.length).toBe(1);
    expect(yes.updates[0]!['isActive']).toBe(false);
  });

  it('does not deactivate when the confirmation is declined', async () => {
    TestBed.resetTestingModule();
    const no = await setup(false);
    no.component.form.controls.isActive.setValue(false);
    no.component.save();
    expect(no.confirmed.length).toBe(1);
    expect(no.updates.length).toBe(0);
  });

  it('saves ordinary changes without a confirmation', async () => {
    TestBed.resetTestingModule();
    const { component, updates, confirmed } = await setup(true);
    component.form.controls.name.setValue('Acme Ltd');
    component.save();
    expect(confirmed.length).toBe(0);
    expect(updates[0]!['name']).toBe('Acme Ltd');
  });
});

describe('SettingsSecurityPageComponent', () => {
  async function setup(savedAllowlist: string[], confirmResult = true) {
    const updates: Array<Record<string, unknown>> = [];
    const confirmMessages: string[] = [];
    const policy = {
      maxFailedLogins: 5,
      lockoutMinutes: 15,
      passwordMinLength: 8,
      passwordRequireLetter: true,
      passwordRequireNumber: true,
      passwordRequireSpecial: false,
      requireMfaForPrivileged: false,
      allowSelfRegistration: false,
      refreshRateLimitPerWindow: 60,
      ipAllowlist: savedAllowlist,
    };
    const result = await render(SettingsSecurityPageComponent, [
      { provide: AuthService, useValue: { hasPermission: () => true } },
      { provide: ToastService, useValue: toast },
      {
        provide: ConfirmDialogService,
        useValue: {
          open: (opts: { message: string }) => {
            confirmMessages.push(opts.message);
            return of(confirmResult);
          },
        },
      },
      {
        provide: SecurityService,
        useValue: {
          getStatus: () =>
            of({
              policy,
              metrics: { mfaCoveragePct: 0, mfaEnabled: 0, users: 1, privilegedWithoutMfa: 0, lockedUsers: 0, failedLogins24h: 0 },
              runtime: { jwtSecretsLookStrong: true, nodeEnv: 'test' },
            }),
          getReview: () => of({ summary: { pass: 0, warn: 0, fail: 0 }, checks: [] }),
          listLoginAttempts: () => of({ items: [] }),
          updatePolicy: (body: Record<string, unknown>) => {
            updates.push(body);
            return of({});
          },
        },
      },
      { provide: NotificationsService, useValue: {} },
    ]);
    return { ...result, updates, confirmMessages };
  }

  it('refuses an allowlist containing something that is not an IP address or range', async () => {
    const { fixture, component, updates, el } = await setup([]);
    component.form.controls.ipAllowlistText.setValue('10.0.0.0/8\nmy office');
    component.form.markAsDirty();
    component.save();
    fixture.detectChanges();
    expect(updates.length).toBe(0);
    expect(el.textContent).toContain('"my office" is not a valid IP address or range');
  });

  it('warns that a new allowlist can lock you out, and saves only when confirmed', async () => {
    const { component, updates, confirmMessages } = await setup([]);
    component.form.controls.ipAllowlistText.setValue('203.0.113.10');
    component.save();
    expect(confirmMessages.length).toBe(1);
    expect(confirmMessages[0]).toContain('203.0.113.10');
    expect(confirmMessages[0]).toContain('including you');
    expect(updates[0]!['ipAllowlist']).toEqual(['203.0.113.10']);
  });

  it('does not save the allowlist when the warning is declined', async () => {
    TestBed.resetTestingModule();
    const { component, updates } = await setup([], false);
    component.form.controls.ipAllowlistText.setValue('203.0.113.10');
    component.save();
    expect(updates.length).toBe(0);
  });

  it('saves other policy changes without the allowlist warning when the list is unchanged', async () => {
    TestBed.resetTestingModule();
    const { component, updates, confirmMessages } = await setup(['10.0.0.0/8']);
    component.form.controls.lockoutMinutes.setValue(30);
    component.save();
    expect(confirmMessages.length).toBe(0);
    expect(updates[0]!['lockoutMinutes']).toBe(30);
  });
});
