import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  EmployeeKpi,
  PerformanceKpi,
  PerformanceService,
} from '../../../../core/services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { KpiFormDialogComponent } from '../../dialogs/kpi-form-dialog.component';
import { EmployeeKpiFormDialogComponent } from '../../dialogs/employee-kpi-form-dialog.component';

@Component({
  selector: 'app-performance-kpis-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './performance-kpis-page.component.html',
  styleUrl: './performance-kpis-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceKpisPageComponent implements OnInit {
  private readonly api = inject(PerformanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly currentYear = new Date().getFullYear();
  readonly yearOptions = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  readonly kpis = signal<PerformanceKpi[]>([]);
  readonly assignments = signal<EmployeeKpi[]>([]);
  readonly loading = signal(true);
  readonly assignmentsLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly assignmentsError = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuKpi = signal<PerformanceKpi | null>(null);
  readonly menuAssignment = signal<EmployeeKpi | null>(null);

  readonly canCreate = this.auth.hasPermission('performance:create');
  readonly canUpdate = this.auth.hasPermission('performance:update');
  readonly canDelete = this.auth.hasPermission('performance:delete');

  readonly yearControl = new FormControl(this.currentYear, { nonNullable: true });

  ngOnInit(): void {
    this.yearControl.valueChanges.subscribe(() => this.reloadAssignments());
    this.reload();
  }

  reload(): void {
    this.reloadKpis();
    this.reloadAssignments();
  }

  reloadKpis(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listKpis().subscribe({
      next: (items) => {
        this.kpis.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load KPI catalog. Please try again.');
        this.loading.set(false);
      },
    });
  }

  reloadAssignments(): void {
    this.assignmentsLoading.set(true);
    this.assignmentsError.set(null);
    this.api.listEmployeeKpis({ year: this.yearControl.value, page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.assignments.set(Array.isArray(res) ? res : res.items);
        this.assignmentsLoading.set(false);
      },
      error: () => {
        this.assignmentsError.set('Unable to load employee KPI assignments.');
        this.assignmentsLoading.set(false);
      },
    });
  }

  openCreateKpi(): void {
    this.dialog
      .open(KpiFormDialogComponent, {
        data: {},
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadKpis();
        }
      });
  }

  openEditKpi(item: PerformanceKpi): void {
    this.dialog
      .open(KpiFormDialogComponent, {
        data: { kpi: item },
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadKpis();
        }
      });
  }

  openAssign(): void {
    this.dialog
      .open(EmployeeKpiFormDialogComponent, {
        data: { year: this.yearControl.value, kpis: this.kpis() },
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadAssignments();
        }
      });
  }

  openEditAssignment(item: EmployeeKpi): void {
    this.dialog
      .open(EmployeeKpiFormDialogComponent, {
        data: { assignment: item, year: this.yearControl.value, kpis: this.kpis() },
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reloadAssignments();
        }
      });
  }

  removeKpi(item: PerformanceKpi): void {
    this.confirm
      .open({
        title: 'Delete KPI',
        message: `Delete “${item.name}”?`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.api.deleteKpi(item.id).subscribe({
          next: () => {
            this.toast.success('KPI deleted');
            this.actionId.set(null);
            this.reloadKpis();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete KPI');
          },
        });
      });
  }

  setMenuKpi(item: PerformanceKpi): void {
    this.menuKpi.set(item);
  }

  setMenuAssignment(item: EmployeeKpi): void {
    this.menuAssignment.set(item);
  }

  employeeLabel(item: EmployeeKpi): string {
    return this.api.employeeLabel(item.employee);
  }

  kpiName(item: EmployeeKpi): string {
    return item.kpi?.name ?? item.kpiId;
  }
}
