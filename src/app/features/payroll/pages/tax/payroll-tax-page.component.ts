import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PayrollService, TaxSetting } from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-payroll-tax-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationSectionHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './payroll-tax-page.component.html',
  styleUrl: './payroll-tax-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollTaxPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly tax = signal<TaxSetting | null>(null);
  readonly canUpdate = this.auth.hasPermission('payroll:update');
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    taxYear: [
      this.currentYear,
      [Validators.required, Validators.min(2000), Validators.max(2100)],
    ],
    standardRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    personalAllowance: [0, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.payroll.getTax().subscribe({
      next: (tax) => {
        this.tax.set(tax);
        this.form.patchValue({
          taxYear: tax.taxYear,
          standardRate: tax.standardRate,
          personalAllowance: tax.personalAllowance,
          notes: tax.notes ?? '',
        });
        if (!this.canUpdate) {
          this.form.disable();
        } else {
          this.form.enable();
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load tax settings. Please try again.');
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
    this.payroll
      .updateTax({
        taxYear: Number(raw.taxYear),
        standardRate: Number(raw.standardRate),
        personalAllowance: Number(raw.personalAllowance),
        notes: raw.notes.trim() || null,
      })
      .subscribe({
        next: (tax) => {
          this.tax.set(tax);
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.success('Tax settings saved');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to save tax settings');
        },
      });
  }
}
