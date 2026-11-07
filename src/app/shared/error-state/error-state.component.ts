import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Failed-to-load placeholder with a Retry output. */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="error" role="alert">
      <mat-icon class="error__icon" aria-hidden="true">error_outline</mat-icon>
      <p class="error__title">{{ title() }}</p>
      @if (message()) {
        <p class="error__message">{{ message() }}</p>
      }
      <button mat-stroked-button type="button" (click)="retry.emit()">
        <mat-icon aria-hidden="true">refresh</mat-icon>
        {{ retryLabel() }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2.5rem 1rem;
      text-align: center;
    }
    .error__icon {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 2.5rem;
      color: var(--mat-sys-error, var(--zh-destructive, #dc2626));
    }
    .error__title {
      margin: 0;
      font-weight: 600;
      color: var(--mat-sys-on-surface, var(--zh-foreground, #1f2430));
    }
    .error__message {
      margin: 0 0 0.5rem;
      max-width: 32rem;
      color: var(--mat-sys-on-surface-variant, var(--zh-muted-foreground, #5b6170));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly title = input('Something went wrong');
  readonly message = input('');
  readonly retryLabel = input('Try again');
  readonly retry = output<void>();
}
