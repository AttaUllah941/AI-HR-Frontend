import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

export type ChartSkeletonVariant = 'bars' | 'ascending' | 'donut' | 'funnel';

const BAR_HEIGHTS = [45, 70, 55, 85, 60, 75, 50, 90];
const ASCENDING_HEIGHTS = [28, 34, 41, 47, 55, 63, 72, 84];
const FUNNEL_WIDTHS = [100, 78, 58, 40, 24];

/**
 * Placeholder for a chart.
 * - Default: a card with a title line and bar-like blocks.
 * - `bare`: just the plot area, for use inside a panel that already has its own card and heading.
 * - `variant` picks a plot shape close to the real chart (bars, rising bars, donut or funnel).
 */
@Component({
  selector: 'app-chart-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="chart" [class.chart--bare]="bare()">
      @if (!bare()) {
        <app-skeleton width="40%" height="1rem" />
      }
      <div class="chart__plot" [class]="'chart__plot chart__plot--' + variant()" [style.height]="height()">
        @switch (variant()) {
          @case ('donut') {
            <div class="donut">
              <app-skeleton shape="circle" width="12rem" height="12rem" />
              <span class="donut__hole"></span>
            </div>
            <div class="donut__legend">
              @for (l of legend; track l) {
                <div class="donut__row">
                  <app-skeleton width="0.7rem" height="0.7rem" />
                  <app-skeleton [width]="l + '%'" height="0.75rem" />
                </div>
              }
            </div>
          }
          @case ('funnel') {
            @for (w of funnel; track w) {
              <div class="funnel__row">
                <app-skeleton width="4.5rem" height="0.75rem" />
                <app-skeleton [width]="w + '%'" height="1.9rem" />
              </div>
            }
          }
          @default {
            @for (h of heights(); track $index) {
              <app-skeleton width="100%" [height]="h + '%'" />
            }
          }
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
    .chart--bare {
      padding: 0;
      border: 0;
      background: none;
    }
    .chart__plot {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      align-items: end;
      gap: 0.6rem;
    }
    .chart__plot--donut {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem 2rem;
      flex-wrap: wrap;
      overflow: hidden;
    }
    .chart__plot--funnel {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      gap: 1.1rem;
    }
    .donut {
      position: relative;
      display: grid;
      place-items: center;
    }
    .donut__hole {
      position: absolute;
      width: 7rem;
      height: 7rem;
      border-radius: 50%;
      background: var(--zh-card, #fff);
    }
    .donut__legend {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 8rem;
    }
    .donut__row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .funnel__row {
      display: grid;
      grid-template-columns: 4.5rem minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartSkeletonComponent {
  readonly height = input('14rem');
  readonly bare = input(false);
  readonly variant = input<ChartSkeletonVariant>('bars');

  protected readonly heights = computed(() =>
    this.variant() === 'ascending' ? ASCENDING_HEIGHTS : BAR_HEIGHTS,
  );
  protected readonly legend = [80, 65, 72, 50, 60];
  protected readonly funnel = FUNNEL_WIDTHS;
}
