import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PayrollEntryLine,
  Payslip,
  PayrollService,
} from '../../../core/services/payroll.service';

export interface PayslipDetailDialogData {
  payslip: Payslip;
}

@Component({
  selector: 'app-payslip-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './payslip-detail-dialog.component.html',
  styleUrl: './payslip-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayslipDetailDialogComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  readonly data = inject<PayslipDetailDialogData>(MAT_DIALOG_DATA);

  readonly payslip = signal<Payslip>(this.data.payslip);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.data.payslip.entry?.lines?.length) {
      this.loading.set(true);
      this.payroll.getPayslip(this.data.payslip.id).subscribe({
        next: (slip) => {
          this.payslip.set(slip);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load payslip details.');
          this.loading.set(false);
        },
      });
    }
  }

  formatMoney(amount: number, currency?: string): string {
    return this.payroll.formatMoney(amount, currency || this.payslip().currency);
  }

  periodLabel(): string {
    const slip = this.payslip();
    return `${this.payroll.monthLabel(slip.month)} ${slip.year}`;
  }

  employeeName(): string {
    const e = this.payslip().employee;
    if (!e) {
      return '—';
    }
    return `${e.firstName} ${e.lastName}`.trim();
  }

  lines(): PayrollEntryLine[] {
    return this.payslip().entry?.lines ?? [];
  }

  statusClass(status: string): string {
    return `payroll-status-pill payroll-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
