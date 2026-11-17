import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { OrgChartNode, OrganizationService } from '../../../../core/services/organization.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../components/organization-status/organization-status.component';
import { OrgChartNodeComponent } from './org-chart-node.component';

@Component({
  selector: 'app-org-chart-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
    OrgChartNodeComponent,
  ],
  templateUrl: './org-chart-page.component.html',
  styleUrl: './org-chart-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgChartPageComponent implements OnInit {
  private readonly org = inject(OrganizationService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly companyName = signal('');
  readonly tree = signal<OrgChartNode[]>([]);

  ngOnInit(): void {
    this.reload();
  }

  onTreeKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.getAttribute('role') !== 'treeitem') {
      return;
    }
    const items = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="treeitem"]'),
    );
    const index = items.indexOf(target);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = items[Math.min(index + 1, items.length - 1)];
        break;
      case 'ArrowUp':
        next = items[Math.max(index - 1, 0)];
        break;
      case 'Home':
        next = items[0];
        break;
      case 'End':
        next = items[items.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  }

  /** Roving tabindex: only the focused item is a tab stop. */
  onTreeFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.getAttribute('role') !== 'treeitem') {
      return;
    }
    (event.currentTarget as HTMLElement)
      .querySelectorAll<HTMLElement>('[role="treeitem"]')
      .forEach((item) => item.setAttribute('tabindex', item === target ? '0' : '-1'));
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    this.org.getChart().subscribe({
      next: (data) => {
        this.companyName.set(data.company?.name ?? 'Organization');
        this.tree.set(data.tree);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load organization chart. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
