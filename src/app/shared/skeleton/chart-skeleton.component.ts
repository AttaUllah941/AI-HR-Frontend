import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

const BAR_HEIGHTS = [45, 70, 55, 85, 60, 75, 50, 90];

/** Placeholder for a chart card: title line plus bar-like blocks. */
@Component({
  selector: 'app-chart-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="chart">
      <app-skeleton width="40%" height="1rem" />
      <div class="chart__plot" [style.height]="height()">
        @for (h of bars; track $index) {
          <app-skeleton width="100%" [height]="h + '%'" />
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .chart {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.1rem 1.2rem;
      border: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      border-radius: var(--zh-radius, 0.875rem);
      background: var(--mat-sys-surface-container-lowest, var(--zh-card, #fff));
    }
    .chart__plot {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      align-items: end;
      gap: 0.6rem;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartSkeletonComponent {
  readonly height = input('14rem');
  protected readonly bars = BAR_HEIGHTS;
}
