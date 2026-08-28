import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  passwordErrorMessage,
  passwordValidators,
} from '../../../../core/validators/password.validators';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly passwordErrorMessage = passwordErrorMessage;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', passwordValidators],
    companyName: [''],
  });

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    this.auth
      .register({
        firstName: raw.firstName,
        lastName: raw.lastName,
        email: raw.email,
        password: raw.password,
        companyName: raw.companyName || undefined,
      })
      .subscribe({
        next: (data) => {
          this.submitting.set(false);
          const canSignInNow =
            data.user.status === 'ACTIVE' || Boolean(data.verificationToken);
          this.toast.success(
            canSignInNow
              ? 'Account created. You can sign in now.'
              : 'Account created. Check your email to verify, then sign in.',
          );
          void this.router.navigate(['/auth/login']);
        },
        error: () => this.submitting.set(false),
      });
  }
}
