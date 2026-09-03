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
  selector: 'app-leave-shell',
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
  templateUrl: './leave-shell.component.html',
  styleUrl: './leave-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveShellComponent {
  private readonly router = inject(Router);

  readonly tabs = [
    { label: 'Overview', route: 'overview', icon: 'dashboard' },
    { label: 'Requests', route: 'requests', icon: 'assignment' },
    { label: 'Calendar', route: 'calendar', icon: 'calendar_month' },
    { label: 'Types', route: 'types', icon: 'category' },
    { label: 'Balances', route: 'balances', icon: 'account_balance_wallet' },
    { label: 'Policy', route: 'policy', icon: 'policy' },
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
      { label: 'Leave', route: '/leave/overview' },
      { label: tab?.label ?? 'Overview' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/leave\/([^/?#]+)/);
    return match?.[1] ?? 'overview';
  }
}
