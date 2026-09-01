import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { OrganizationService } from '../../../../core/services/organization.service';
import { OrganizationStatusComponent } from '../../components/organization-status/organization-status.component';

@Component({
  selector: 'app-organization-overview',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './organization-overview.component.html',
  styleUrl: './organization-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewComponent implements OnInit {
  private readonly org = inject(OrganizationService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly companyName = signal('');
  readonly counts = signal({ branches: 0, departments: 0, teams: 0, designations: 0 });

  readonly cards = [
    { key: 'branches' as const, label: 'Branches', icon: 'apartment', route: '../branches' },
    { key: 'departments' as const, label: 'Departments', icon: 'account_tree', route: '../departments' },
    { key: 'teams' as const, label: 'Teams', icon: 'groups', route: '../teams' },
    { key: 'designations' as const, label: 'Designations', icon: 'badge', route: '../designations' },
  ];

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.org.getOverview().subscribe({
      next: (data) => {
        this.companyName.set(data.company.name);
        this.counts.set(data.counts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load organization overview. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
