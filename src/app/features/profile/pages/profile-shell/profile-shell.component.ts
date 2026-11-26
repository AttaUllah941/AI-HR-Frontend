import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { humanizeCode, initials } from '../../../../shared/utils/text';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-profile-shell',
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
  templateUrl: './profile-shell.component.html',
  styleUrl: './profile-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Who is signed in, from the session already in memory (no extra request). */
  readonly identity = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return null;
    }
    return {
      name: `${user.firstName} ${user.lastName}`.trim() || user.email,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      initials: initials(user.firstName, user.lastName, user.email),
      roles: user.roles.map((role) => humanizeCode(role)),
    };
  });
  /** Set when the picture cannot be loaded, so the initials show instead of a broken image. */
  readonly avatarFailed = signal(false);

  readonly tabs = [
    { label: 'Overview', route: 'overview', icon: 'person' },
    { label: 'Security', route: 'security', icon: 'security' },
    { label: 'Sessions', route: 'sessions', icon: 'devices' },
    { label: 'Preferences', route: 'preferences', icon: 'tune' },
    { label: 'Activity', route: 'activity', icon: 'history' },
  ];

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
      { label: 'Profile', route: '/profile/overview' },
      { label: tab?.label ?? 'Overview' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/profile\/([^/?#]+)/);
    return match?.[1] ?? 'overview';
  }
}
