import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, LoadingOverlayComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  readonly appName = environment.appName;
  readonly appFullName = environment.appFullName;
}
