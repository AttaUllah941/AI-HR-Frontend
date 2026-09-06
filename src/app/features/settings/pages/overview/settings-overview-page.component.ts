import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SettingsService, SettingsSummary } from '../../../../core/services/settings.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-settings-overview-page',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, OrganizationStatusComponent],
  templateUrl: './settings-overview-page.component.html',
  styleUrl: './settings-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverviewPageComponent implements OnInit {
  private readonly settings = inject(SettingsService);

  readonly summary = signal<SettingsSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load settings.');
        this.loading.set(false);
      },
    });
  }
}
