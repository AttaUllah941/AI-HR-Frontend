import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeMode, ThemeService } from '../../../core/services/theme.service';
import { initialsOf } from '../user-display';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);

  private readonly themeService = inject(ThemeService);

  readonly user = this.auth.user;
  readonly themeMode = this.themeService.mode;
  readonly themeOptions: ReadonlyArray<{ mode: ThemeMode; label: string; icon: string }> = [
    { mode: 'light', label: 'Light theme', icon: 'light_mode' },
    { mode: 'dark', label: 'Dark theme', icon: 'dark_mode' },
    { mode: 'system', label: 'System theme', icon: 'brightness_auto' },
  ];
  readonly initials = computed(() => initialsOf(this.user()));

  setTheme(mode: ThemeMode): void {
    this.themeService.setMode(mode);
  }

  logout(): void {
    this.auth.logout();
  }
}
