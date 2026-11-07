import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { PRIMARY_NAV } from '../nav-items';

/** Phone-only tab bar: the first four modules the user can open, plus "More" for the full menu. */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  private readonly auth = inject(AuthService);

  readonly more = output<void>();

  readonly items = computed(() =>
    PRIMARY_NAV.filter(
      (item) => !item.permissions?.length || this.auth.hasAnyPermission(...item.permissions),
    ).slice(0, 4),
  );
}
