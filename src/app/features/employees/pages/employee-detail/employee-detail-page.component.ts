import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { filter } from 'rxjs';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  ActivityItem,
  EmployeeDetail,
  EmployeeService,
  EmployeeStatus,
  TimelineEvent,
} from '../../../../core/services/employee.service';
import { EmployeeFormDialogComponent } from '../../dialogs/employee-form-dialog.component';
import { EmployeeSubFormDialogComponent } from '../../dialogs/employee-sub-form-dialog.component';
import type { SubResourceType } from '../../models/employee-sub-resource.types';

@Component({
  selector: 'app-employee-detail-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    PageHeaderComponent,
    BreadcrumbComponent,
    OrganizationStatusComponent,
    EmptyStateComponent,
  ],
  templateUrl: './employee-detail-page.component.html',
  styleUrl: './employee-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly employees = inject(EmployeeService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly employee = signal<EmployeeDetail | null>(null);
  readonly timeline = signal<TimelineEvent[]>([]);
  readonly activity = signal<ActivityItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canUpdate = this.auth.hasPermission('employees:update');

  readonly breadcrumbItems = signal([{ label: 'Employees', route: '/employees' }, { label: '…' }]);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.employees.getById(id).subscribe({
      next: (employee) => {
        this.employee.set(employee);
        this.breadcrumbItems.set([
          { label: 'Employees', route: '/employees' },
          { label: `${employee.firstName} ${employee.lastName}` },
        ]);
        this.loading.set(false);
        this.loadTimeline(id);
        this.loadActivity(id);
      },
      error: () => {
        this.error.set('Unable to load employee profile.');
        this.loading.set(false);
      },
    });
  }

  private loadTimeline(id: string): void {
    this.employees.getTimeline(id).subscribe({
      next: (data) => this.timeline.set(data.events),
    });
  }

  private loadActivity(id: string): void {
    this.employees.getActivity(id).subscribe({
      next: (data) => this.activity.set(data.items),
    });
  }

  reload(): void {
    const id = this.employee()?.id;
    if (id) {
      this.load(id);
    }
  }

  openEdit(): void {
    const id = this.employee()?.id;
    if (!id) return;

    this.dialog
      .open(EmployeeFormDialogComponent, {
        data: { employeeId: id },
        width: '640px',
        maxHeight: '90vh',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  openSubForm(type: SubResourceType, record: object | null = null): void {
    const employee = this.employee();
    if (!employee) return;

    this.dialog
      .open(EmployeeSubFormDialogComponent, {
        data: { type, employeeId: employee.id, record },
        width: '520px',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  deleteSub(type: SubResourceType, id: string, label: string): void {
    const emp = this.employee();
    if (!emp) return;

    const deleteFn = () => {
      switch (type) {
        case 'emergency':
          return this.employees.deleteEmergencyContact(emp.id, id);
        case 'education':
          return this.employees.deleteEducation(emp.id, id);
        case 'experience':
          return this.employees.deleteExperience(emp.id, id);
        case 'skill':
          return this.employees.deleteSkill(emp.id, id);
        case 'certification':
          return this.employees.deleteCertification(emp.id, id);
        case 'document':
          return this.employees.deleteDocument(emp.id, id);
      }
    };

    this.confirm
      .open({
        title: 'Delete record',
        message: `Remove “${label}”?`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        deleteFn().subscribe({
          next: () => {
            this.toast.success('Record deleted');
            this.reload();
          },
          error: () => this.toast.error('Unable to delete record'),
        });
      });
  }

  initials(employee: EmployeeDetail): string {
    return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`.toUpperCase();
  }

  statusClass(status: EmployeeStatus): string {
    return `emp-status emp-status--${status.toLowerCase()}`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString();
  }
}
