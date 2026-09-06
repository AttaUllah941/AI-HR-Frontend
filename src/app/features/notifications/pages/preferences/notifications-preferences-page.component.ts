import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  NotificationPreference,
  NotificationsService,
} from '../../../../core/services/notifications.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-notifications-preferences-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './notifications-preferences-page.component.html',
  styleUrl: './notifications-preferences-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPreferencesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    preferences: this.fb.array<FormGroup>([]),
  });

  get preferences(): FormArray<FormGroup> {
    return this.form.get('preferences') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notifications.getPreferences().subscribe({
      next: (res) => {
        this.preferences.clear();
        for (const pref of res.preferences) {
          this.preferences.push(this.createPrefGroup(pref));
        }
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(
          err?.error?.message || err?.message || 'Unable to load preferences.',
        );
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.saving() || this.preferences.length === 0) {
      return;
    }
    this.saving.set(true);
    const payload = this.preferences.getRawValue() as NotificationPreference[];
    this.notifications.upsertPreferences(payload).subscribe({
      next: (res) => {
        this.preferences.clear();
        for (const pref of res.preferences) {
          this.preferences.push(this.createPrefGroup(pref));
        }
        this.toast.success('Preferences saved.');
        this.saving.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(err?.error?.message || err?.message || 'Unable to save preferences.');
        this.saving.set(false);
      },
    });
  }

  categoryLabel(category: string): string {
    return this.notifications.categoryLabel(category);
  }

  private createPrefGroup(pref: NotificationPreference): FormGroup {
    return this.fb.nonNullable.group({
      category: [pref.category],
      inAppEnabled: [pref.inAppEnabled],
      emailEnabled: [pref.emailEnabled],
      pushEnabled: [pref.pushEnabled],
    });
  }
}
