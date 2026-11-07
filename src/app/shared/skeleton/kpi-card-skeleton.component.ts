import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent } from './skeleton.component';

/** Placeholder for a KPI / stat card (icon, label, value, trend line). */
@Component({
  selector: 'app-kpi-card-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div class="kpi">
      <div class="kpi__top">
        <app-skeleton width="45%" height="0.8rem" />
        <app-skeleton shape="circle" width="2rem" height="2rem" />
      </div>
      <app-skeleton width="55%" height="1.9rem" />
      <app-skeleton width="35%" height="0.7rem" />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.1rem 1.2rem;
      border: 1px solid var(--mat-sys-outline-variant, var(--zh-border, #e5e7eb));
      border-radius: var(--zh-radius, 0.875rem);
      background: var(--mat-sys-surface-container-lowest, var(--zh-card, #fff));
    }
    .kpi__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardSkeletonComponent {}
