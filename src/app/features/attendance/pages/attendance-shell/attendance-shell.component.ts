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
  selector: 'app-attendance-shell',
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
  templateUrl: './attendance-shell.component.html',
  styleUrl: './attendance-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceShellComponent {
  private readonly router = inject(Router);

  readonly tabs = [
    { label: 'Today', route: 'today', icon: 'today' },
    { label: 'Daily', route: 'daily', icon: 'view_list' },
    { label: 'Timesheet', route: 'timesheet', icon: 'calendar_month' },
    { label: 'Shifts', route: 'shifts', icon: 'schedule' },
    { label: 'Holidays', route: 'holidays', icon: 'event' },
    { label: 'Overtime', route: 'overtime', icon: 'more_time' },
  ];

  private readonly activeRoute = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.resolveActiveRoute()),
      startWith(this.resolveActiveRoute()),
    ),
    { initialValue: 'today' },
  );

  readonly activeTab = computed(() => this.tabs.find((tab) => tab.route === this.activeRoute()));

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const tab = this.activeTab();
    return [
      { label: 'Attendance', route: '/attendance/today' },
      { label: tab?.label ?? 'Today' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/attendance\/([^/?#]+)/);
    return match?.[1] ?? 'today';
  }
}
