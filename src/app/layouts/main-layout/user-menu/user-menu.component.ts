import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';
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

  readonly user = this.auth.user;
  readonly initials = computed(() => initialsOf(this.user()));

  logout(): void {
    this.auth.logout();
  }
}
