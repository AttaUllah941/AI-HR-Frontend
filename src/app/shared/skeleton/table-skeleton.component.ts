import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Table-shaped placeholder: a header row plus `rows` rows of `cols` cells. */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="ts" [style.--ts-cols]="cols()">
      <div class="ts__row ts__row--head">
        @for (c of columnIndexes(); track c) {
          <app-skeleton height="0.75rem" width="60%" />
        }
      </div>
      @for (r of rowIndexes(); track r) {
        <div class="ts__row">
          @for (c of columnIndexes(); track c) {
            @if (c === 0) {
              <div class="ts__lead">
                <app-skeleton shape="circle" width="2rem" height="2rem" />
                <app-skeleton height="0.85rem" width="70%" />
              </div>
            } @else {
              <app-skeleton height="0.85rem" [width]="widthFor(r, c)" />
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
    .ts__row {
      display: grid;
      grid-template-columns: repeat(var(--ts-cols, 5), minmax(0, 1fr));
      align-items: center;
      gap: 1rem;
      /* Same height as a real table row, so nothing moves when the rows arrive. */
      min-height: 4.1rem;
      box-sizing: border-box;
      padding: 0.7rem 1rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
    }
    .ts__row--head {
      min-height: 2.6rem;
      padding-block: 0.6rem;
    }
    .ts__lead {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSkeletonComponent {
  readonly rows = input(6);
  readonly cols = input(5);

  readonly rowIndexes = computed(() => range(this.rows()));
  readonly columnIndexes = computed(() => range(this.cols()));

  /** Deterministic width variation so rows do not look like a uniform block. */
  widthFor(row: number, col: number): string {
    return `${45 + ((row * 7 + col * 13) % 4) * 12}%`;
  }
}

function range(count: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => i);
}
