import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly status = signal<'pending' | 'success' | 'error'>('pending');
  readonly message = signal('Verifying your email…');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('error');
      this.message.set('Verification token is missing.');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: () => {
        this.status.set('success');
        this.message.set('Your email has been verified. You can sign in now.');
        this.toast.success('Email verified');
      },
      error: () => {
        this.status.set('error');
        this.message.set('Verification failed. The link may be invalid or expired.');
      },
    });
  }
}
