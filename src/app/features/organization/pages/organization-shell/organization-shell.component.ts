import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-organization-shell',
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
  templateUrl: './organization-shell.component.html',
  styleUrl: './organization-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationShellComponent {
  private readonly router = inject(Router);

  readonly tabs = [
    { label: 'Overview', route: 'overview', icon: 'dashboard' },
    { label: 'Branches', route: 'branches', icon: 'apartment' },
    { label: 'Departments', route: 'departments', icon: 'account_tree' },
    { label: 'Teams', route: 'teams', icon: 'groups' },
    { label: 'Designations', route: 'designations', icon: 'badge' },
    { label: 'Org chart', route: 'chart', icon: 'hub' },
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
      { label: 'Organization', route: '/organization/overview' },
      { label: tab?.label ?? 'Overview' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/organization\/([^/?#]+)/);
    return match?.[1] ?? 'overview';
  }
}
