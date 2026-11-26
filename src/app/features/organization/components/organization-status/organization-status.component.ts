import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ErrorStateComponent } from '../../../../shared/error-state/error-state.component';
import { CardsSkeletonComponent } from '../../../../shared/skeleton/cards-skeleton.component';
import { ChartSkeletonComponent } from '../../../../shared/skeleton/chart-skeleton.component';
import { FormSkeletonComponent } from '../../../../shared/skeleton/form-skeleton.component';
import { KpiCardSkeletonComponent } from '../../../../shared/skeleton/kpi-card-skeleton.component';
import { SkeletonComponent } from '../../../../shared/skeleton/skeleton.component';
import { ListSkeletonComponent } from '../../../../shared/skeleton/list-skeleton.component';
import { ProfileSkeletonComponent } from '../../../../shared/skeleton/profile-skeleton.component';
import { TableSkeletonComponent } from '../../../../shared/skeleton/table-skeleton.component';

/** Placeholder shown on first load. `none` shows a generic stack of cards (never a spinner). */
export type StatusSkeleton = 'none' | 'profile' | 'table' | 'list' | 'kpi' | 'stats' | 'form';

/**
 * Loading / error wrapper for a page section.
 * - First load (`loading` and no `hasData`): skeleton for the chosen layout.
 * - Refetch (`loading` and `hasData`): projected content stays visible, dimmed.
 * - Failure: ErrorState with retry.
 */
@Component({
  selector: 'app-organization-status',
  standalone: true,
  imports: [
    ErrorStateComponent,
    CardsSkeletonComponent,
    ChartSkeletonComponent,
    FormSkeletonComponent,
    KpiCardSkeletonComponent,
    SkeletonComponent,
    ListSkeletonComponent,
    ProfileSkeletonComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './organization-status.component.html',
  styleUrl: './organization-status.component.scss',
  host: {
    '[class.is-refetching]': 'loading() && hasData()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationStatusComponent {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly loadingMessage = input('Loading…');
  readonly errorTitle = input('Something went wrong');
  readonly showRetry = input(true);
  readonly skeleton = input<StatusSkeleton>('none');
  /** True once the section has content to keep on screen while refetching. */
  readonly hasData = input(false);

  readonly retry = output<void>();

  protected readonly kpiPlaceholders = [0, 1, 2, 3];
}
