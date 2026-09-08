import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-organization-status',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './organization-status.component.html',
  styleUrl: './organization-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationStatusComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly loadingMessage = input('Loading…');
  readonly errorTitle = input('Something went wrong');
  readonly showRetry = input(true);

  readonly retry = output<void>();
}
