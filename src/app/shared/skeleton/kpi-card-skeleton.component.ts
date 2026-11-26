import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/**
 * Placeholder for a KPI tile. Same box as the real tiles (icon square beside a label and a value,
 * fixed height) so the page does not shift when the data arrives.
 */
@Component({
  selector: 'app-kpi-card-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="kpi">
      <app-skeleton width="2.5rem" height="2.5rem" style="border-radius: 0.7rem" />
      <div class="kpi__text">
        <app-skeleton width="55%" height="0.75rem" />
        <app-skeleton width="40%" height="1.4rem" />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .kpi {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      height: 5.25rem;
      box-sizing: border-box;
      padding: 1rem 1.15rem;
      border: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      border-radius: var(--zh-radius, 0.875rem);
      background: var(--mat-sys-surface-container-lowest, var(--zh-card, #fff));
    }
    .kpi__text {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.55rem;
      min-width: 0;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardSkeletonComponent {}
