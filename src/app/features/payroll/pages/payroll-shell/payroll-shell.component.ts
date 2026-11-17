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
  selector: 'app-payroll-shell',
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
  templateUrl: './payroll-shell.component.html',
  styleUrl: './payroll-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollShellComponent {
  private readonly router = inject(Router);

  readonly tabs = [
    { label: 'Overview', route: 'overview', icon: 'dashboard' },
    { label: 'Runs', route: 'runs', icon: 'payments' },
    { label: 'Structures', route: 'structures', icon: 'account_tree' },
    { label: 'Components', route: 'components', icon: 'category' },
    { label: 'Payslips', route: 'payslips', icon: 'receipt_long' },
    { label: 'Tax', route: 'tax', icon: 'request_quote' },
    { label: 'Reports', route: 'reports', icon: 'assessment' },
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
      { label: 'Payroll', route: '/payroll/overview' },
      { label: tab?.label ?? 'Overview' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/payroll\/([^/?#]+)/);
    return match?.[1] ?? 'overview';
  }
}
