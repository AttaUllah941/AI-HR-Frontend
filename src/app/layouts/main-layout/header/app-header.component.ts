import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeService } from '../../../core/services/theme.service';
import { TopProgressBarComponent } from '../../../shared/top-progress-bar/top-progress-bar.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Top bar: mobile menu button, title/greeting, global search, company chip, bell and user menu. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TopProgressBarComponent,
    NotificationBellComponent,
    UserMenuComponent,
  ],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private pendingNavKey: string | null = null;
  private pendingNavTimer: ReturnType<typeof setTimeout> | null = null;

  readonly mobileOpen = input(false);
  /** Current page title; when null the greeting is shown instead. */
  readonly pageTitle = input<string | null>(null);
  readonly greeting = input('');
  readonly companyName = input('');
  readonly menuToggle = output<void>();

  readonly searchQuery = signal('');

  private readonly themeService = inject(ThemeService);
  private readonly prefersDark =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly systemDark = signal(this.prefersDark?.matches ?? false);

  /** True when the dark theme is showing (explicitly chosen, or "system" resolving to dark). */
  readonly isDark = computed(() => {
    const mode = this.themeService.mode();
    return mode === 'dark' || (mode === 'system' && this.systemDark());
  });

  toggleTheme(): void {
    this.themeService.setMode(this.isDark() ? 'light' : 'dark');
  }

  constructor() {
    const onSystemChange = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
    this.prefersDark?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => {
      this.prefersDark?.removeEventListener('change', onSystemChange);
      if (this.pendingNavTimer) {
        clearTimeout(this.pendingNavTimer);
        this.pendingNavTimer = null;
      }
    });
  }

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    this.openCommandPalette(query);
  }

  openCommandPalette(initialQuery = ''): void {
    void import('../../../features/search/dialogs/command-palette-dialog.component').then(
      ({ CommandPaletteDialogComponent }) => {
        this.dialog.open(CommandPaletteDialogComponent, {
          width: '36rem',
          data: { initialQuery },
          autoFocus: true,
        });
      },
    );
  }

  openShortcutsHelp(): void {
    void import('../../../features/search/dialogs/shortcuts-help-dialog.component').then(
      ({ ShortcutsHelpDialogComponent }) => {
        this.dialog.open(ShortcutsHelpDialogComponent, { width: '28rem' });
      },
    );
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const typing =
      tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openCommandPalette(this.searchQuery());
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      this.openShortcutsHelp();
      return;
    }

    if (typing || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (this.pendingNavKey === 'g') {
      this.pendingNavKey = null;
      if (this.pendingNavTimer) {
        clearTimeout(this.pendingNavTimer);
        this.pendingNavTimer = null;
      }
      const routes: Record<string, string> = {
        d: '/dashboard',
        e: '/employees',
        f: '/files',
        p: '/profile',
        s: '/search',
      };
      const route = routes[key];
      if (route) {
        event.preventDefault();
        void this.router.navigateByUrl(route);
      }
      return;
    }

    if (key === 'g') {
      this.pendingNavKey = 'g';
      if (this.pendingNavTimer) {
        clearTimeout(this.pendingNavTimer);
      }
      this.pendingNavTimer = setTimeout(() => {
        this.pendingNavKey = null;
        this.pendingNavTimer = null;
      }, 800);
    }
  }
}
