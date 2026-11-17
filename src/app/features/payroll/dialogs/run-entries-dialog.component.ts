import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PayrollEntry,
  PayrollRun,
  PayrollService,
} from '../../../core/services/payroll.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

export interface RunEntriesDialogData {
  run: PayrollRun;
}

@Component({
  selector: 'app-run-entries-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
  ],
  templateUrl: './run-entries-dialog.component.html',
  styleUrl: './run-entries-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunEntriesDialogComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  readonly data = inject<RunEntriesDialogData>(MAT_DIALOG_DATA);

  readonly items = signal<PayrollEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.payroll.listEntries(this.data.run.id).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load payroll entries.');
        this.loading.set(false);
      },
    });
  }

  formatMoney(amount: number): string {
    return this.payroll.formatMoney(amount);
  }

  employeeName(entry: PayrollEntry): string {
    const e = entry.employee;
    if (!e) {
      return '—';
    }
    return `${e.firstName} ${e.lastName}`.trim();
  }

  runTitle(): string {
    const run = this.data.run;
    return run.title || `${this.payroll.monthLabel(run.month)} ${run.year}`;
  }
}
