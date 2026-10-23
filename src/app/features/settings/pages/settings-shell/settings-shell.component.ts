import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatTabsModule,
    MatIconModule,
    PageHeaderComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './settings-shell.component.html',
  styleUrl: './settings-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly allTabs = [
    { label: 'Overview', route: 'overview', icon: 'dashboard', permission: 'settings:view' },
    { label: 'Company', route: 'company', icon: 'business', permission: 'settings:view' },
    { label: 'Users', route: 'users', icon: 'group', permission: 'users:view' },
    { label: 'Roles', route: 'roles', icon: 'admin_panel_settings', permission: 'roles:view' },
    { label: 'Email', route: 'email', icon: 'mail', permission: 'settings:view' },
    { label: 'Storage', route: 'storage', icon: 'cloud', permission: 'settings:view' },
    { label: 'System', route: 'system', icon: 'tune', permission: 'settings:view' },
    { label: 'Security', route: 'security', icon: 'security', permission: 'settings:view' },
    { label: 'Audit', route: 'audit', icon: 'history', permission: 'settings:view' },
  ] as const;

  readonly tabs = this.allTabs.filter((tab) => this.auth.hasPermission(tab.permission));

  private readonly activeRoute = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.resolveActiveRoute()),
      startWith(this.resolveActiveRoute()),
    ),
    { initialValue: 'overview' },
  );

  readonly activeTab = computed(() => this.tabs.find((tab) => tab.route === this.activeRoute()));

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const tab = this.activeTab();
    return [
      { label: 'Settings', route: '/settings/overview' },
      { label: tab?.label ?? 'Overview' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/settings\/([^/?#]+)/);
    return match?.[1] ?? 'overview';
  }
}
