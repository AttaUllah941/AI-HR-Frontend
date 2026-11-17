import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Placeholder for a vertical list of items (avatar + two text lines). */
@Component({
  selector: 'app-list-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="list">
      @for (i of items(); track i) {
        <div class="list__item">
          <app-skeleton shape="circle" width="2.5rem" height="2.5rem" />
          <div class="list__text">
            <app-skeleton width="55%" height="0.9rem" />
            <app-skeleton width="80%" height="0.7rem" />
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .list {
      display: flex;
      flex-direction: column;
    }
    .list__item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.8rem 0.25rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
    }
    .list__text {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.5rem;
      min-width: 0;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListSkeletonComponent {
  readonly rows = input(5);
  readonly items = computed(() =>
    Array.from({ length: Math.max(0, Math.floor(this.rows())) }, (_, i) => i),
  );
}
