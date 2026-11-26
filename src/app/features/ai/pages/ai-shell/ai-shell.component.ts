import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../../../shared/components/breadcrumb/breadcrumb.component';


@Component({
  selector: 'app-ai-shell',
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
  templateUrl: './ai-shell.component.html',
  styleUrl: './ai-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Screening and appraisals read recruitment and performance data, so they need that access too. */
  private readonly allTabs = [
    { label: 'Overview', route: 'overview', icon: 'auto_awesome' },
    { label: 'Assistant', route: 'assistant', icon: 'chat' },
    { label: 'Screening', route: 'screening', icon: 'person_search', permission: 'recruitment:view' },
    { label: 'Appraisals', route: 'appraisals', icon: 'rate_review', permission: 'performance:view' },
    { label: 'Policies', route: 'policies', icon: 'policy' },
    { label: 'Recommendations', route: 'recommendations', icon: 'lightbulb' },
  ];

  readonly tabs = this.allTabs.filter((tab) => !tab.permission || this.auth.hasPermission(tab.permission));

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
      { label: 'AI Assistant', route: '/ai/overview' },
      { label: tab?.label ?? 'Overview' },
    ];
  });

  private resolveActiveRoute(): string {
    const match = this.router.url.match(/\/ai\/([^/?#]+)/);
    return match?.[1] ?? 'overview';
  }
}
