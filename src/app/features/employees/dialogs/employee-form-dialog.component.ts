import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  Branch,
  Department,
  Designation,
  OrganizationService,
  Team,
} from '../../../core/services/organization.service';
import {
  EmployeeDetail,
  EmployeeService,
  EmployeeStatus,
  EmploymentType,
} from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

const STATUSES: EmployeeStatus[] = [
  'DRAFT',
  'ACTIVE',
  'ON_LEAVE',
  'PROBATION',
  'NOTICE_PERIOD',
  'TERMINATED',
  'RESIGNED',
  'INACTIVE',
];

const EMPLOYMENT_TYPES: EmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
  'CONSULTANT',
];

@Component({
  selector: 'app-employee-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './employee-form-dialog.component.html',
  styleUrl: './employee-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly employees = inject(EmployeeService);
  private readonly org = inject(OrganizationService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<EmployeeFormDialogComponent, boolean>);
  readonly data = inject<{ employeeId: string | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly loading = signal(Boolean(this.data.employeeId));
  readonly branches = signal<Branch[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly designations = signal<Designation[]>([]);
  readonly managers = signal<Array<{ id: string; label: string }>>([]);

  readonly statuses = STATUSES;
  readonly employmentTypes = EMPLOYMENT_TYPES;

  readonly form = this.fb.nonNullable.group({
    employeeCode: ['', [Validators.required, Validators.maxLength(50)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    personalEmail: [''],
    branchId: [''],
    departmentId: [''],
    teamId: [''],
    designationId: [''],
    managerId: [''],
    employmentType: ['FULL_TIME' as EmploymentType],
    status: ['DRAFT' as EmployeeStatus],
    joinDate: [null as Date | null],
    workLocation: [''],
    city: [''],
    country: [''],
    bio: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.org.listBranches().subscribe({ next: (items) => this.branches.set(items) });
    this.org.listDepartments().subscribe({ next: (items) => this.departments.set(items) });
    this.org.listTeams().subscribe({ next: (items) => this.teams.set(items) });
    this.org.listDesignations().subscribe({ next: (items) => this.designations.set(items) });
    this.employees.list({ pageSize: 100, sortBy: 'lastName' }).subscribe({
      next: (data) =>
        this.managers.set(
          data.items
            .filter((e) => e.id !== this.data.employeeId)
            .map((e) => ({ id: e.id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` })),
        ),
    });

    if (this.data.employeeId) {
      this.employees.getById(this.data.employeeId).subscribe({
        next: (employee) => this.patchForm(employee),
        error: () => {
          this.loading.set(false);
          this.toast.error('Unable to load employee');
        },
      });
    }
  }

  private patchForm(employee: EmployeeDetail): void {
    this.form.patchValue({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone ?? '',
      personalEmail: employee.personalEmail ?? '',
      branchId: employee.branch?.id ?? '',
      departmentId: employee.department?.id ?? '',
      teamId: employee.team?.id ?? '',
      designationId: employee.designation?.id ?? '',
      managerId: employee.manager?.id ?? '',
      employmentType: employee.employmentType,
      status: employee.status,
      joinDate: employee.joinDate ? new Date(employee.joinDate) : null,
      workLocation: employee.workLocation ?? '',
      city: employee.city ?? '',
      country: employee.country ?? '',
      bio: employee.bio ?? '',
      notes: employee.notes ?? '',
    });
    this.loading.set(false);
  }

  submit(): void {
    if (this.form.invalid || this.saving() || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      employeeCode: raw.employeeCode,
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      phone: raw.phone || null,
      personalEmail: raw.personalEmail || null,
      branchId: raw.branchId || null,
      departmentId: raw.departmentId || null,
      teamId: raw.teamId || null,
      designationId: raw.designationId || null,
      managerId: raw.managerId || null,
      employmentType: raw.employmentType,
      status: raw.status,
      joinDate: raw.joinDate ? raw.joinDate.toISOString() : null,
      workLocation: raw.workLocation || null,
      city: raw.city || null,
      country: raw.country || null,
      bio: raw.bio || null,
      notes: raw.notes || null,
    };

    const request$ = this.data.employeeId
      ? this.employees.update(this.data.employeeId, body)
      : this.employees.create(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.employeeId ? 'Employee updated' : 'Employee created');
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Unable to save employee');
      },
    });
  }
}
