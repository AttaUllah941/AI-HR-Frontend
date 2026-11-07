import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

/**
 * Thin indeterminate bar pinned to the bottom edge of the (positioned) header.
 * Non-blocking: driven by LoadingService, which already applies the 200 ms delay
 * and 400 ms minimum so it does not flicker.
 */
@Component({
  selector: 'app-top-progress-bar',
  standalone: true,
  template: `
    @if (loading.isLoading()) {
      <div class="bar" role="status" aria-live="polite" aria-label="Loading">
        <span class="bar__fill"></span>
      </div>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: auto 0 0 0;
      height: 3px;
      pointer-events: none;
      overflow: hidden;
    }
    .bar {
      height: 100%;
      background: color-mix(in oklab, var(--mat-sys-primary, var(--zh-primary, #4f46e5)) 18%, transparent);
    }
    .bar__fill {
      display: block;
      width: 40%;
      height: 100%;
      border-radius: 999px;
      background: var(--mat-sys-primary, var(--zh-primary, #4f46e5));
      animation: app-top-progress 1.1s ease-in-out infinite;
    }
    @keyframes app-top-progress {
      from {
        transform: translateX(-100%);
      }
      to {
        transform: translateX(250%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar__fill {
        width: 100%;
        animation: none;
        opacity: 0.6;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopProgressBarComponent {
  protected readonly loading = inject(LoadingService);
}
