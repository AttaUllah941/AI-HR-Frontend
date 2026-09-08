import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { JobOpening, RecruitmentService } from '../../../core/services/recruitment.service';
import {
  Branch,
  Department,
  Designation,
  OrganizationService,
} from '../../../core/services/organization.service';
import { EmployeeListItem, EmployeeService, EmploymentType } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface JobFormDialogData {
  job?: JobOpening | null;
}

const EMPLOYMENT_TYPES: EmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
  'CONSULTANT',
];

@Component({
  selector: 'app-job-form-dialog',
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
  ],
  templateUrl: './job-form-dialog.component.html',
  styleUrl: './job-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly org = inject(OrganizationService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<JobFormDialogComponent, boolean>);
  readonly data = inject<JobFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.job;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly departments = signal<Department[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly designations = signal<Designation[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    title: [this.data.job?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    code: [this.data.job?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    employmentType: [
      (this.data.job?.employmentType ?? 'FULL_TIME') as EmploymentType,
      Validators.required,
    ],
    location: [this.data.job?.location ?? ''],
    openings: [this.data.job?.openings ?? 1, [Validators.required, Validators.min(1)]],
    departmentId: [this.data.job?.departmentId ?? ''],
    designationId: [this.data.job?.designationId ?? ''],
    branchId: [this.data.job?.branchId ?? ''],
    hiringManagerId: [this.data.job?.hiringManagerId ?? ''],
    salaryMin: [this.data.job?.salaryMin ?? null as number | null],
    salaryMax: [this.data.job?.salaryMax ?? null as number | null],
    currency: [this.data.job?.currency ?? 'USD'],
    description: [this.data.job?.description ?? ''],
    requirements: [this.data.job?.requirements ?? ''],
  });

  constructor() {
    this.org.listDepartments().subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
    this.org.listBranches().subscribe({
      next: (items) => this.branches.set(items),
      error: () => this.branches.set([]),
    });
    this.org.listDesignations().subscribe({
      next: (items) => this.designations.set(items),
      error: () => this.designations.set([]),
    });
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });

    if (this.isEdit) {
      this.form.controls.code.disable();
    }
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  employmentLabel(type: EmploymentType): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      title: raw.title.trim(),
      code: raw.code.trim(),
      employmentType: raw.employmentType,
      location: raw.location.trim() || null,
      openings: Number(raw.openings),
      departmentId: raw.departmentId || null,
      designationId: raw.designationId || null,
      branchId: raw.branchId || null,
      hiringManagerId: raw.hiringManagerId || null,
      salaryMin: raw.salaryMin === null || raw.salaryMin === ('' as unknown) ? null : Number(raw.salaryMin),
      salaryMax: raw.salaryMax === null || raw.salaryMax === ('' as unknown) ? null : Number(raw.salaryMax),
      currency: raw.currency.trim() || 'USD',
      description: raw.description.trim() || null,
      requirements: raw.requirements.trim() || null,
    };

    const request$ = this.data.job
      ? this.recruitment.updateJob(this.data.job.id, body)
      : this.recruitment.createJob(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.job ? 'Job updated' : 'Job created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save job');
      },
    });
  }
}
