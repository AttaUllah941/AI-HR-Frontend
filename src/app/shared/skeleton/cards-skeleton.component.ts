import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Generic page placeholder: a stack of cards, each with a title line and a few text lines. */
@Component({
  selector: 'app-cards-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="cards">
      @for (c of cardIndexes(); track c) {
        <div class="cards__card">
          <app-skeleton width="30%" height="1rem" />
          <app-skeleton width="55%" height="0.75rem" />
          <div class="cards__lines">
            <app-skeleton width="100%" height="0.85rem" />
            <app-skeleton width="92%" height="0.85rem" />
            <app-skeleton width="70%" height="0.85rem" />
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
      gap: 1rem;
    }
    .cards__card {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      min-height: 11rem;
      box-sizing: border-box;
      padding: 1.1rem 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      border-radius: var(--zh-radius, 0.875rem);
      background: var(--mat-sys-surface-container-lowest, var(--zh-card, #fff));
    }
    .cards__lines {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-top: 0.4rem;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsSkeletonComponent {
  readonly count = input(4);
  readonly cardIndexes = computed(() =>
    Array.from({ length: Math.max(0, Math.floor(this.count())) }, (_, i) => i),
  );
}
