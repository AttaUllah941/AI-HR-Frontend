import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MfaSetupData } from '../../../../core/models/api.models';

@Component({
  selector: 'app-mfa-setup-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './mfa-setup-page.component.html',
  styleUrl: './mfa-setup-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaSetupPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly setup = signal<MfaSetupData | null>(null);
  readonly submitting = signal(false);
  readonly loading = signal(true);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnInit(): void {
    this.auth.setupMfa().subscribe({
      next: (data) => {
        this.setup.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.enableMfa(this.form.controls.code.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Two-factor authentication enabled');
        void this.router.navigate(['/dashboard']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
