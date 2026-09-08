import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PerformanceApiService } from '../../services/performance-api.service';
import {
  PerformanceInsight,
  PerformanceReview,
  PerformanceSummary,
} from '../../models/performance.models';

@Component({
  selector: 'app-performance-home',
  standalone: true,
  imports: [DecimalPipe, MatIconModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './performance-home.component.html',
  styleUrl: './performance-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceHomeComponent implements OnInit {
  private readonly performanceApi = inject(PerformanceApiService);

  readonly loading = signal(true);
  readonly summary = signal<PerformanceSummary | null>(null);
  readonly topPerformers = signal<PerformanceReview[]>([]);
  readonly insights = signal<PerformanceInsight[]>([]);
  readonly cycleLabel = signal('Q4');

  readonly kpiCards = computed(() => {
    const s = this.summary();
    const avgDelta = s?.avgScoreDelta ?? 0;
    const goalsDelta = s?.goalsOnTrackDelta ?? 0;
    return [
      {
        label: 'Company avg score',
        value: `${(s?.avgScore ?? 0).toFixed(1)} / 5`,
        delta: `${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} vs prior`,
        tone: 'score',
      },
      {
        label: 'Goals on track',
        value: `${s?.goalsOnTrackPercent ?? 0}%`,
        delta: `${goalsDelta >= 0 ? '+' : ''}${goalsDelta}% this cycle`,
        tone: 'goals',
      },
      {
        label: 'Ready for promotion',
        value: `${s?.promotionReadyCount ?? 0}`,
        delta: 'AI recommended',
        tone: 'promo',
      },
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.loading.set(false);
      }
    };

    this.performanceApi.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.cycleLabel.set(data.cycle.label);
        done();
      },
      error: () => done(),
    });

    this.performanceApi.topPerformers(5).subscribe({
      next: (data) => {
        this.topPerformers.set(data.items);
        this.cycleLabel.set(data.cycle.label);
        done();
      },
      error: () => done(),
    });

    this.performanceApi.insights().subscribe({
      next: (data) => {
        this.insights.set(data.items);
        done();
      },
      error: () => done(),
    });
  }
}
