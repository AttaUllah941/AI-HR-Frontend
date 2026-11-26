import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import {
  AttendanceReport,
  ReportExportFormat,
  ReportsService,
} from '../../../../core/services/reports.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ReportsBarChartComponent } from '../../components/reports-bar-chart.component';
import { SmartLoaderComponent } from '../../../../shared/smart-loader/smart-loader.component';
import { LOADER_MESSAGES } from '../../../../shared/smart-loader/loader-messages';
import { ChartSkeletonComponent } from '../../../../shared/skeleton/chart-skeleton.component';
import { DateFieldComponent } from '../../../../shared/components/date-field/date-field.component';
import { Subscription, startWith } from 'rxjs';
import { toIsoDate } from '../../../../core/utils/date-format';
import { formatMinutes } from '../../utils/format-minutes';

type PresetId = '7d' | '30d' | 'month';

/** A range of whole local days ending today. Local dates, not UTC, so "today" is the user's today. */
function rangeFor(preset: PresetId): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (preset === 'month') {
    from.setDate(1);
  } else {
    from.setDate(from.getDate() - (preset === '7d' ? 6 : 29));
  }
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

@Component({
  selector: 'app-reports-attendance-page',
  standalone: true,
  imports: [
    DateFieldComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatMenuModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ReportsBarChartComponent,
    SmartLoaderComponent,
    ChartSkeletonComponent,
  ],
  templateUrl: './reports-attendance-page.component.html',
  styleUrl: './reports-attendance-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsAttendancePageComponent implements OnInit {
  private inflight: Subscription | null = null;
  protected readonly exportMessages = LOADER_MESSAGES.export;
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly defaults = rangeFor('30d');

  readonly report = signal<AttendanceReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly exporting = signal(false);

  readonly canExport = this.auth.hasPermission('reports:export');

  readonly dateFrom = new FormControl(this.defaults.from, { nonNullable: true });
  readonly dateTo = new FormControl(this.defaults.to, { nonNullable: true });

  readonly presets: ReadonlyArray<{ id: PresetId; label: string }> = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: 'month', label: 'This month' },
  ];

  private readonly fromValue = toSignal(this.dateFrom.valueChanges.pipe(startWith(this.dateFrom.value)), {
    initialValue: this.dateFrom.value,
  });
  private readonly toValue = toSignal(this.dateTo.valueChanges.pipe(startWith(this.dateTo.value)), {
    initialValue: this.dateTo.value,
  });
  /** ISO dates compare correctly as strings. */
  readonly rangeError = computed(() =>
    this.fromValue() && this.toValue() && this.fromValue() > this.toValue()
      ? 'The start date must be on or before the end date.'
      : '',
  );
  /** The preset the current dates match, if any. */
  readonly activePreset = computed(
    () =>
      this.presets.find((p) => {
        const range = rangeFor(p.id);
        return range.from === this.fromValue() && range.to === this.toValue();
      })?.id ?? null,
  );

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (this.rangeError()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.inflight?.unsubscribe();
    this.inflight = this.reports
      .getAttendance({
        dateFrom: this.dateFrom.value,
        dateTo: this.dateTo.value,
      })
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(
            err?.error?.message || err?.message || 'Unable to load attendance report.',
          );
          this.loading.set(false);
        },
      });
  }

  exportReport(format: ReportExportFormat): void {
    if (!this.canExport || this.rangeError()) {
      return;
    }
    this.exporting.set(true);
    this.reports
      .exportReport({
        reportType: 'ATTENDANCE',
        format,
        dateFrom: this.dateFrom.value,
        dateTo: this.dateTo.value,
      })
      .subscribe({
        next: () => {
          this.toast.success(`${format} download ready.`);
          this.exporting.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Export failed.');
          this.exporting.set(false);
        },
      });
  }

  applyPreset(id: PresetId): void {
    const range = rangeFor(id);
    this.dateFrom.setValue(range.from);
    this.dateTo.setValue(range.to);
    this.reload();
  }

  minutes(value: number): string {
    return formatMinutes(value);
  }

  formatNumber(value: number): string {
    return this.reports.formatNumber(value);
  }

  statusLabel(status: string): string {
    return this.reports.statusLabel(status);
  }

  statusClass(status: string): string {
    return `reports-status-pill reports-status-pill--${this.reports.statusTone(status)}`;
  }
}
