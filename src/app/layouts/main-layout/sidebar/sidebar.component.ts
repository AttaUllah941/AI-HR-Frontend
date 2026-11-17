import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { PreloadOnHoverDirective } from '../../../core/routing/preload-on-hover.directive';
import { environment } from '../../../../environments/environment';
import { NavItem, PRIMARY_NAV, SECONDARY_NAV } from '../nav-items';
import { displayNameOf, initialsOf, roleLabelOf } from '../user-display';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, PreloadOnHoverDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);

  /** Mobile drawer state (below 960px the sidebar slides in over the content). */
  readonly open = input(false);
  /** Emitted when a navigation link is used so the mobile drawer can close. */
  readonly closeMenu = output<void>();

  readonly appName = environment.appName;
  readonly user = this.auth.user;
  readonly displayName = computed(() => displayNameOf(this.user()));
  readonly roleLabel = computed(() => roleLabelOf(this.user()));
  readonly initials = computed(() => initialsOf(this.user()));

  readonly navItems = computed(() => this.visible(PRIMARY_NAV));
  readonly secondaryItems = computed(() => this.visible(SECONDARY_NAV));

  logout(): void {
    this.auth.logout();
  }

  private visible(items: NavItem[]): NavItem[] {
    return items.filter(
      (item) => !item.permissions?.length || this.auth.hasAnyPermission(...item.permissions),
    );
  }
}
