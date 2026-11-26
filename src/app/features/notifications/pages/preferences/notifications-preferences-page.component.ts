import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  CATEGORY_TONES,
} from '../../notification-categories';
import {
  NotificationPreference,
  NotificationsService,
} from '../../../../core/services/notifications.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-notifications-preferences-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './notifications-preferences-page.component.html',
  styleUrl: './notifications-preferences-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPreferencesPageComponent implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    preferences: this.fb.array<FormGroup>([]),
  });

  /** Re-reads the template whenever any toggle changes (the view is OnPush). */
  private readonly changes = toSignal(this.form.valueChanges);

  /** True while there are edits that have not been saved. */
  hasEdits(): boolean {
    this.changes();
    return this.form.dirty && !this.saving();
  }

  /** The Security category is the one place where turning everything off has a real cost. */
  isMuted(group: AbstractControl): boolean {
    this.changes();
    const v = group.value as { inAppEnabled: boolean; emailEnabled: boolean; pushEnabled: boolean };
    return !v.inAppEnabled && !v.emailEnabled && !v.pushEnabled;
  }

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
          this.form.markAsPristine();
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

  iconFor(category: string): string {
    return CATEGORY_ICONS[category] ?? 'notifications';
  }

  toneFor(category: string): string {
    return CATEGORY_TONES[category] ?? 'neutral';
  }

  describe(category: string): string {
    return CATEGORY_DESCRIPTIONS[category] ?? '';
  }

  private createPrefGroup(pref: NotificationPreference): FormGroup {
    return this.fb.nonNullable.group({
      category: [pref.category],
      inAppEnabled: [pref.inAppEnabled],
      emailEnabled: [pref.emailEnabled],
      pushEnabled: [pref.pushEnabled],
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

}
