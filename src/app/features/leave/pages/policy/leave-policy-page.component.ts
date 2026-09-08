import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LeavePolicy, LeaveService } from '../../../../core/services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-leave-policy-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './leave-policy-page.component.html',
  styleUrl: './leave-policy-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeavePolicyPageComponent implements OnInit {
  private readonly leave = inject(LeaveService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly policy = signal<LeavePolicy | null>(null);
  readonly canUpdate = this.auth.hasPermission('leave:update');

  readonly form = this.fb.nonNullable.group({
    allowNegativeBalance: [false],
    countWeekends: [false],
    countHolidays: [false],
    minNoticeDays: [0, [Validators.required, Validators.min(0), Validators.max(90)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.leave.getPolicy().subscribe({
      next: (policy) => {
        this.policy.set(policy);
        this.form.patchValue({
          allowNegativeBalance: policy.allowNegativeBalance,
          countWeekends: policy.countWeekends,
          countHolidays: policy.countHolidays,
          minNoticeDays: policy.minNoticeDays,
        });
        if (!this.canUpdate) {
          this.form.disable();
        } else {
          this.form.enable();
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load leave policy. Please try again.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (!this.canUpdate || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.leave
      .updatePolicy({
        allowNegativeBalance: raw.allowNegativeBalance,
        countWeekends: raw.countWeekends,
        countHolidays: raw.countHolidays,
        minNoticeDays: Number(raw.minNoticeDays),
      })
      .subscribe({
        next: (policy) => {
          this.policy.set(policy);
          this.saving.set(false);
          this.toast.success('Leave policy saved');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to save leave policy');
        },
      });
  }
}
