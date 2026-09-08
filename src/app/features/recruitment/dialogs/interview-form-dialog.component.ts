import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  Interview,
  InterviewType,
  JobApplication,
  RecruitmentService,
} from '../../../core/services/recruitment.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface InterviewFormDialogData {
  interview?: Interview | null;
  applicationId?: string;
}

const INTERVIEW_TYPES: InterviewType[] = [
  'PHONE',
  'VIDEO',
  'ONSITE',
  'TECHNICAL',
  'HR',
  'FINAL',
];

@Component({
  selector: 'app-interview-form-dialog',
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
  templateUrl: './interview-form-dialog.component.html',
  styleUrl: './interview-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterviewFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<InterviewFormDialogComponent, boolean>);
  readonly data = inject<InterviewFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.interview;
  readonly interviewTypes = INTERVIEW_TYPES;
  readonly applications = signal<JobApplication[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    applicationId: [
      this.data.interview?.applicationId ?? this.data.applicationId ?? '',
      Validators.required,
    ],
    type: [(this.data.interview?.type ?? 'VIDEO') as InterviewType, Validators.required],
    scheduledAt: [
      this.toDateTimeLocal(this.data.interview?.scheduledAt) || this.defaultSchedule(),
      Validators.required,
    ],
    durationMinutes: [
      this.data.interview?.durationMinutes ?? 60,
      [Validators.required, Validators.min(15), Validators.max(480)],
    ],
    locationOrLink: [this.data.interview?.locationOrLink ?? ''],
    interviewerId: [this.data.interview?.interviewerId ?? ''],
  });

  constructor() {
    if (!this.isEdit) {
      this.recruitment
        .listApplications({ page: 1, pageSize: 100 })
        .subscribe({
          next: (res) =>
            this.applications.set(
              res.items.filter((a) => !['HIRED', 'REJECTED', 'WITHDRAWN'].includes(a.status)),
            ),
          error: () => this.applications.set([]),
        });
    }
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });

    if (this.isEdit) {
      this.form.controls.applicationId.disable();
    }
  }

  applicationLabel(app: JobApplication): string {
    const candidate = app.candidate
      ? `${app.candidate.firstName} ${app.candidate.lastName}`
      : app.candidateId;
    const job = app.jobOpening?.title ?? app.jobOpeningId;
    return `${candidate} · ${job}`;
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  typeLabel(type: InterviewType): string {
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
      type: raw.type,
      scheduledAt: new Date(raw.scheduledAt).toISOString(),
      durationMinutes: Number(raw.durationMinutes),
      locationOrLink: raw.locationOrLink.trim() || null,
      interviewerId: raw.interviewerId || null,
    };

    const request$ = this.data.interview
      ? this.recruitment.updateInterview(this.data.interview.id, body)
      : this.recruitment.createInterview({
          ...body,
          applicationId: raw.applicationId,
        });

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.interview ? 'Interview updated' : 'Interview scheduled');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save interview');
      },
    });
  }

  private toDateTimeLocal(value?: string | null): string {
    if (!value) {
      return '';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private defaultSchedule(): string {
    const d = new Date();
    d.setHours(d.getHours() + 24, 0, 0, 0);
    return this.toDateTimeLocal(d.toISOString());
  }
}
