import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService, SettingsSummary } from '../../../../core/services/settings.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { emailProviderLabel, storageProviderLabel } from '../../utils/labels';
import { NotificationsService } from '../../../../core/services/notifications.service';

interface SettingsCatalogCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  permission?: string;
}

@Component({
  selector: 'app-settings-overview-page',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, OrganizationStatusComponent],
  templateUrl: './settings-overview-page.component.html',
  styleUrl: './settings-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverviewPageComponent implements OnInit {
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);

  readonly summary = signal<SettingsSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly catalog: SettingsCatalogCard[] = [
    {
      title: 'Company',
      description: 'Name, logo, address, legal info',
      icon: 'business',
      route: '/settings/company',
      permission: 'settings:view',
    },
    {
      title: 'Departments & Teams',
      description: 'Manage org structure and reporting',
      icon: 'account_tree',
      route: '/organization',
    },
    {
      title: 'Roles & Permissions',
      description: 'Access control, admin roles, RBAC',
      icon: 'admin_panel_settings',
      route: '/settings/roles',
      permission: 'roles:view',
    },
    {
      title: 'Users',
      description: 'Invite accounts, statuses, and role grants',
      icon: 'group',
      route: '/settings/users',
      permission: 'users:view',
    },
    {
      title: 'Leave Types & Holidays',
      description: 'Configure leave rules and holiday calendars',
      icon: 'event_available',
      route: '/leave',
    },
    {
      title: 'Shifts & Attendance',
      description: 'Working hours, shift patterns, geo-fence',
      icon: 'schedule',
      route: '/attendance',
    },
    {
      title: 'Notifications',
      description: 'Email, in-app, and mobile notification preferences',
      icon: 'notifications',
      route: '/notifications/preferences',
    },
    {
      title: 'Integrations',
      description: 'Slack, Google Workspace, Zoom, and more',
      icon: 'hub',
      route: '/settings/system',
      permission: 'settings:view',
    },
    {
      title: 'Email',
      description: 'Provider, from-address, and delivery settings',
      icon: 'mail',
      route: '/settings/email',
      permission: 'settings:view',
    },
    {
      title: 'Storage',
      description: 'File storage provider and public base URL',
      icon: 'cloud',
      route: '/settings/storage',
      permission: 'settings:view',
    },
    {
      title: 'Security',
      description: 'Password policy, lockouts, and login attempts',
      icon: 'security',
      route: '/settings/security',
      permission: 'settings:view',
    },
    {
      title: 'Audit logs',
      description: 'Company-scoped administrative activity trail',
      icon: 'history',
      route: '/settings/audit',
      permission: 'settings:view',
    },
  ];

  readonly cards = computed(() =>
    this.catalog.filter((card) => !card.permission || this.auth.hasPermission(card.permission)),
  );

  ngOnInit(): void {
    this.reload();
  }

  private readonly notifications = inject(NotificationsService);
  /** The mail provider the server is really using (from its environment), not the saved setting. */
  readonly runtimeEmail = signal<string | null>(null);
  protected readonly emailLabel = emailProviderLabel;
  protected readonly storageLabel = storageProviderLabel;

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
        // Best effort: needs notification access. Without it the page just says "Unknown".
        this.notifications.getStatus().subscribe({
          next: (status) => this.runtimeEmail.set(status.emailProvider),
          error: () => this.runtimeEmail.set(null),
        });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load settings.');
        this.loading.set(false);
      },
    });
  }
}
