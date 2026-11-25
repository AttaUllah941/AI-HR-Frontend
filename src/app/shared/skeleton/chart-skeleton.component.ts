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
 * - `detailed` (opt-in) draws what the real chart will have: y-axis labels, gridlines, x-axis labels
 *   and a legend row (bars / ascending), or label + value rows on a track (funnel). The block keeps
 *   exactly `height`, so the real chart replaces it without the page shifting.
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
      @if (detailed() && (variant() === 'bars' || variant() === 'ascending')) {
        <div class="detail" [style.height]="height()">
          <div class="axes">
            <div class="axes__y">
              @for (t of yTicks; track t) {
                <app-skeleton width="1.4rem" height="0.5rem" />
              }
            </div>
            <div class="axes__main">
              <div class="axes__plot">
                <div class="axes__grid">
                  @for (t of yTicks; track t) {
                    <span></span>
                  }
                </div>
                <div class="axes__bars">
                  @for (h of detailedHeights(); track $index) {
                    <div class="axes__col">
                      <app-skeleton width="58%" [height]="h + '%'" class="axes__bar" />
                    </div>
                  }
                </div>
              </div>
              <div class="axes__x">
                @for (h of detailedHeights(); track $index) {
                  <div class="axes__xcell"><app-skeleton width="1.6rem" height="0.55rem" /></div>
                }
              </div>
            </div>
          </div>
          <div class="legend">
            @for (w of legendWidths; track $index) {
              <span class="legend__item">
                <app-skeleton shape="circle" width="0.55rem" height="0.55rem" />
                <app-skeleton [width]="w" height="0.55rem" />
              </span>
            }
          </div>
        </div>
      } @else if (detailed() && variant() === 'funnel') {
        <div class="detail detail--funnel" [style.height]="height()">
          @for (w of funnel; track w) {
            <div class="track">
              <div class="track__head">
                <app-skeleton width="5rem" height="0.65rem" />
                <app-skeleton width="1.75rem" height="0.65rem" />
              </div>
              <div class="track__rail">
                <app-skeleton [width]="w + '%'" height="0.85rem" class="track__fill" />
              </div>
            </div>
          }
        </div>
      } @else {
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
      }
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

    /* ---- detailed: mirrors the real chart's anatomy ---- */
    .detail {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      min-height: 0;
    }
    .axes {
      flex: 1;
      display: flex;
      gap: 0.6rem;
      min-height: 0;
    }
    .axes__y {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-end;
      /* keep the labels level with the gridlines, above the x-axis label row */
      padding-bottom: 1.35rem;
      width: 1.6rem;
    }
    .axes__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .axes__plot {
      position: relative;
      flex: 1;
      min-height: 0;
    }
    .axes__grid {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .axes__grid span {
      height: 0;
      border-top: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      opacity: 0.8;
    }
    .axes__bars {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      align-items: end;
    }
    .axes__col {
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .axes__bar {
      border-radius: 0.35rem 0.35rem 0 0;
    }
    .axes__x {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      height: 0.85rem;
    }
    .axes__xcell {
      display: flex;
      justify-content: center;
    }
    .legend {
      display: flex;
      justify-content: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .legend__item {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .detail--funnel {
      justify-content: space-between;
      gap: 0.75rem;
    }
    .track {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .track__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .track__rail {
      height: 0.85rem;
      border-radius: 999px;
      background: color-mix(in oklab, var(--zh-muted, #eee) 70%, transparent);
    }
    .track__fill {
      border-radius: 999px;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartSkeletonComponent {
  readonly height = input('14rem');
  readonly bare = input(false);
  readonly variant = input<ChartSkeletonVariant>('bars');
  /** Draw axes, gridlines and a legend (or label + value rows for the funnel). Off by default. */
  readonly detailed = input(false);

  protected readonly heights = computed(() =>
    this.variant() === 'ascending' ? ASCENDING_HEIGHTS : BAR_HEIGHTS,
  );
  protected readonly detailedHeights = computed(() => this.heights().slice(0, 7));
  protected readonly yTicks = [0, 1, 2, 3, 4, 5];
  protected readonly legendWidths = ['2.6rem', '3.6rem', '3rem'];
  protected readonly legend = [80, 65, 72, 50, 60];
  protected readonly funnel = FUNNEL_WIDTHS;
}
