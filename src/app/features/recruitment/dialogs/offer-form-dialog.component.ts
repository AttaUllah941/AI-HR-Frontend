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
  JobApplication,
  JobOffer,
  RecruitmentService,
} from '../../../core/services/recruitment.service';
import { ToastService } from '../../../core/services/toast.service';

export interface OfferFormDialogData {
  offer?: JobOffer | null;
  applicationId?: string;
}

@Component({
  selector: 'app-offer-form-dialog',
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
  templateUrl: './offer-form-dialog.component.html',
  styleUrl: './offer-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recruitment = inject(RecruitmentService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<OfferFormDialogComponent, boolean>);
  readonly data = inject<OfferFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.offer;
  readonly applications = signal<JobApplication[]>([]);

  readonly form = this.fb.nonNullable.group({
    applicationId: [
      this.data.offer?.applicationId ?? this.data.applicationId ?? '',
      Validators.required,
    ],
    title: [this.data.offer?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    salary: [this.data.offer?.salary ?? 0, [Validators.required, Validators.min(0)]],
    currency: [this.data.offer?.currency ?? 'USD', [Validators.required, Validators.maxLength(10)]],
    startDate: [this.toDateInput(this.data.offer?.startDate)],
    expiresAt: [this.toDateInput(this.data.offer?.expiresAt)],
    notes: [this.data.offer?.notes ?? ''],
  });

  constructor() {
    if (!this.isEdit) {
      this.recruitment.listApplications({ page: 1, pageSize: 100 }).subscribe({
        next: (res) =>
          this.applications.set(
            res.items.filter((a) => ['INTERVIEW', 'OFFER', 'SCREENING'].includes(a.status) && !a.offer),
          ),
        error: () => this.applications.set([]),
      });
    }

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

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      title: raw.title.trim(),
      salary: Number(raw.salary),
      currency: raw.currency.trim() || 'USD',
      startDate: raw.startDate ? new Date(raw.startDate).toISOString() : null,
      expiresAt: raw.expiresAt ? new Date(raw.expiresAt).toISOString() : null,
      notes: raw.notes.trim() || null,
    };

    const request$ = this.data.offer
      ? this.recruitment.updateOffer(this.data.offer.id, body)
      : this.recruitment.createOffer({
          ...body,
          applicationId: raw.applicationId,
        });

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.offer ? 'Offer updated' : 'Offer created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save offer');
      },
    });
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toISOString().slice(0, 10);
  }
}
