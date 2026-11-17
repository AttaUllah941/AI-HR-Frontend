import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  PROFILE_DATE_FORMAT_OPTIONS,
  PROFILE_LOCALE_OPTIONS,
  PROFILE_THEMES,
  PROFILE_THEME_LABELS,
  PROFILE_TIME_FORMATS,
  PROFILE_TIMEZONE_OPTIONS,
  ProfileTheme,
  ProfileTimeFormat,
  ProfileService,
  WEEK_START_OPTIONS,
} from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { ThemeService, isThemeMode } from '../../../../core/services/theme.service';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-profile-preferences-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './profile-preferences-page.component.html',
  styleUrl: './profile-preferences-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePreferencesPageComponent implements OnInit, HasUnsavedChanges {
  private readonly themeService = inject(ThemeService);
  private readonly fb = inject(FormBuilder);
  private readonly profile = inject(ProfileService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly themes = PROFILE_THEMES;
  readonly themeLabels = PROFILE_THEME_LABELS;
  readonly timeFormats = PROFILE_TIME_FORMATS;
  readonly locales = signal<string[]>([...PROFILE_LOCALE_OPTIONS]);
  readonly timezones = signal<string[]>([...PROFILE_TIMEZONE_OPTIONS]);
  readonly dateFormats = signal<string[]>([...PROFILE_DATE_FORMAT_OPTIONS]);
  readonly weekStartsOnOptions = WEEK_START_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    theme: ['system' as ProfileTheme, Validators.required],
    locale: ['en-US', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
    timezone: ['UTC', [Validators.required, Validators.minLength(1), Validators.maxLength(80)]],
    dateFormat: [
      'DD MMM YYYY',
      [Validators.required, Validators.minLength(2), Validators.maxLength(40)],
    ],
    timeFormat: ['24h' as ProfileTimeFormat, Validators.required],
    weekStartsOn: [1, [Validators.required, Validators.min(0), Validators.max(6)]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.getPreferences().subscribe({
      next: (prefs) => {
        const locale = prefs.locale || 'en-US';
        const timezone = prefs.timezone || 'UTC';
        const dateFormat = prefs.dateFormat || 'DD MMM YYYY';
        this.locales.set(this.withOption(PROFILE_LOCALE_OPTIONS, locale));
        this.timezones.set(this.withOption(PROFILE_TIMEZONE_OPTIONS, timezone));
        this.dateFormats.set(this.withOption(PROFILE_DATE_FORMAT_OPTIONS, dateFormat));
        this.form.reset({
          theme: (prefs.theme as ProfileTheme) || 'system',
          locale,
          timezone,
          dateFormat,
          timeFormat: (prefs.timeFormat as ProfileTimeFormat) || '24h',
          weekStartsOn: prefs.weekStartsOn ?? 1,
        });
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load preferences.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.profile
      .updatePreferences({
        theme: raw.theme,
        locale: raw.locale.trim(),
        timezone: raw.timezone.trim(),
        dateFormat: raw.dateFormat.trim(),
        timeFormat: raw.timeFormat,
        weekStartsOn: Number(raw.weekStartsOn),
      })
      .subscribe({
        next: (prefs) => {
          if (isThemeMode(prefs.theme)) {
            this.themeService.setMode(prefs.theme, { persist: false });
          }
          const locale = prefs.locale || 'en-US';
          const timezone = prefs.timezone || 'UTC';
          const dateFormat = prefs.dateFormat || 'DD MMM YYYY';
          this.locales.set(this.withOption(PROFILE_LOCALE_OPTIONS, locale));
          this.timezones.set(this.withOption(PROFILE_TIMEZONE_OPTIONS, timezone));
          this.dateFormats.set(this.withOption(PROFILE_DATE_FORMAT_OPTIONS, dateFormat));
          this.form.reset({
            theme: (prefs.theme as ProfileTheme) || 'system',
            locale,
            timezone,
            dateFormat,
            timeFormat: (prefs.timeFormat as ProfileTimeFormat) || '24h',
            weekStartsOn: prefs.weekStartsOn ?? 1,
          });
          this.toast.success('Preferences saved.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save preferences.');
          this.saving.set(false);
        },
      });
  }

  private withOption(options: string[], value: string): string[] {
    return options.includes(value) ? [...options] : [value, ...options];
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

}
