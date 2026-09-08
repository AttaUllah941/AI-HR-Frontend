import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import QRCode from 'qrcode';
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
  readonly qrDataUrl = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly loading = signal(true);
  readonly mfaEnabled = signal(false);

  readonly enableForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly disableForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.mfaEnabled) {
      this.mfaEnabled.set(true);
      this.loading.set(false);
      return;
    }

    this.startSetup();
  }

  private startSetup(): void {
    this.loading.set(true);
    this.auth.setupMfa().subscribe({
      next: async (data) => {
        this.setup.set(data);
        try {
          const url = await QRCode.toDataURL(data.otpauthUrl, {
            width: 200,
            margin: 2,
            errorCorrectionLevel: 'M',
          });
          this.qrDataUrl.set(url);
        } catch {
          this.qrDataUrl.set(null);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      },
    });
  }

  onEnable(): void {
    if (this.enableForm.invalid || this.submitting()) {
      this.enableForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.enableMfa(this.enableForm.controls.code.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.mfaEnabled.set(true);
        this.toast.success('Two-factor authentication enabled');
        this.auth.me().subscribe({ error: () => undefined });
      },
      error: () => this.submitting.set(false),
    });
  }

  onDisable(): void {
    if (this.disableForm.invalid || this.submitting()) {
      this.disableForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { password, code } = this.disableForm.getRawValue();
    this.auth.disableMfa(password, code).subscribe({
      next: () => {
        this.submitting.set(false);
        this.mfaEnabled.set(false);
        this.setup.set(null);
        this.qrDataUrl.set(null);
        this.toast.success('Two-factor authentication disabled');
        this.startSetup();
      },
      error: () => this.submitting.set(false),
    });
  }
}
