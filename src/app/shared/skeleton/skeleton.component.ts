import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonShape = 'rect' | 'circle';

/**
 * Placeholder block with a shimmer. Decorative: hidden from assistive tech
 * (the surrounding region should expose loading state instead).
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: '',
  styles: `
    :host {
      display: block;
      flex: none;
      max-width: 100%;
      border-radius: var(--zh-skeleton-radius, 0.5rem);
      background-color: var(--mat-sys-surface-container-highest, var(--zh-muted, #e6e8ee));
      background-image: linear-gradient(
        90deg,
        transparent 0%,
        color-mix(in oklab, var(--mat-sys-surface-container-lowest, var(--zh-card, #fff)) 70%, transparent) 50%,
        transparent 100%
      );
      background-size: 200% 100%;
      background-repeat: no-repeat;
      background-position: 150% 0;
      animation: app-skeleton-shimmer 1.4s ease-in-out infinite;
    }

    :host([data-shape='circle']) {
      border-radius: 50%;
    }

    @keyframes app-skeleton-shimmer {
      to {
        background-position: -50% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
        background-image: none;
      }
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[attr.data-shape]': 'shape()',
    '[style.width]': 'resolvedWidth()',
    '[style.height]': 'resolvedHeight()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  /** Any CSS length, e.g. `100%`, `12rem`. A bare number is treated as px. */
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>('1rem');
  readonly shape = input<SkeletonShape>('rect');

  resolvedWidth(): string {
    return toCssLength(this.width());
  }

  resolvedHeight(): string {
    return toCssLength(this.height());
  }
}

function toCssLength(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}
