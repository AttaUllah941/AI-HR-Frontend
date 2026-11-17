import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PayrollReport, PayrollService } from '../../../../core/services/payroll.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-payroll-reports-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './payroll-reports-page.component.html',
  styleUrl: './payroll-reports-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollReportsPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly report = signal<PayrollReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });

  ngOnInit(): void {
    this.yearControl.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.payroll.getReport(this.yearControl.value).subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load payroll report. Please try again.');
        this.loading.set(false);
      },
    });
  }

  monthLabel(month: number): string {
    return this.payroll.monthLabel(month);
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatMoney(amount: number | undefined): string {
    return this.payroll.formatMoney(amount ?? 0);
  }

  statusClass(status: string): string {
    return `payroll-status-pill payroll-status-pill--${status.toLowerCase()}`;
  }
}
