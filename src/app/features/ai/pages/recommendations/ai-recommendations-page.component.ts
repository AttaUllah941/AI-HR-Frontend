import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  AiInsight,
  AiRecommendation,
  AiService,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-ai-recommendations-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './ai-recommendations-page.component.html',
  styleUrl: './ai-recommendations-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRecommendationsPageComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly recommendations = signal<AiRecommendation[]>([]);
  readonly insights = signal<AiInsight[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('ai:create');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      recommendations: this.ai.getRecommendations({ limit: 10 }),
      insights: this.ai.getInsights(),
    }).subscribe({
      next: ({ recommendations, insights }) => {
        this.recommendations.set(recommendations);
        this.insights.set(insights);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load recommendations.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    if (!this.canCreate || this.refreshing()) {
      return;
    }
    this.refreshing.set(true);
    forkJoin({
      recommendations: this.ai.refreshRecommendations({ limit: 10 }),
      insights: this.ai.refreshInsights(),
    }).subscribe({
      next: ({ recommendations, insights }) => {
        this.recommendations.set(recommendations);
        this.insights.set(insights);
        this.refreshing.set(false);
        this.toast.success('Recommendations refreshed.');
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(
          err?.error?.message || err?.message || 'Refresh failed. Please try again.',
        );
        this.refreshing.set(false);
      },
    });
  }

  impactClass(impact: string): string {
    return `ai-status-pill ai-status-pill--${this.ai.impactClass(impact)}`;
  }

  severityClass(severity: string): string {
    return `ai-status-pill ai-status-pill--${this.ai.severityClass(severity)}`;
  }
}
