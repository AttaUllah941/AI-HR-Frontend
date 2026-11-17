import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ProfileActivityItem,
  ProfileService,
} from '../../../../core/services/profile.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-profile-activity-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './profile-activity-page.component.html',
  styleUrl: './profile-activity-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileActivityPageComponent implements OnInit {
  private readonly profile = inject(ProfileService);

  readonly items = signal<ProfileActivityItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.listActivity(50).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load activity.');
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string | null | undefined): string {
    return this.profile.formatDateTime(iso);
  }

  relative(iso: string | null | undefined): string {
    return this.profile.relativeTime(iso);
  }
}
