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
  selector: 'app-notifications-shell',
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
  templateUrl: './notifications-shell.component.html',
  styleUrl: './notifications-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  private readonly allTabs = [
    { label: 'Inbox', route: 'inbox', icon: 'inbox' },
    { label: 'Preferences', route: 'preferences', icon: 'tune' },
    {
      label: 'Templates',
      route: 'templates',
      icon: 'description',
      permission: 'notifications:manage' as const,
    },
    { label: 'Devices', route: 'devices', icon: 'devices' },
  ];

  readonly tabs = this.allTabs.filter(
    (tab) => !tab.permission || this.auth.hasPermission(tab.permission),
  );

  private readonly activeRoute = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.resolveActiveRoute()),
      startWith(this.resolveActiveRoute()),
    ),
    { initialValue: 'inbox' },
  );

  readonly activeTab = computed(() => this.tabs.find((tab) => tab.route === this.activeRoute()));

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const tab = this.activeTab();
    return [
      { label: 'Notifications', route: '/notifications/inbox' },
      { label: tab?.label ?? 'Inbox' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/notifications\/([^/?#]+)/);
    return match?.[1] ?? 'inbox';
  }
}
