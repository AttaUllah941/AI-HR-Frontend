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
