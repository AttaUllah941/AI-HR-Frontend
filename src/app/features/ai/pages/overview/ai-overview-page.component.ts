import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  AiInsight,
  AiService,
  AiStatus,
  AiSummary,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-ai-overview-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './ai-overview-page.component.html',
  styleUrl: './ai-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiOverviewPageComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);

  readonly status = signal<AiStatus | null>(null);
  readonly summary = signal<AiSummary | null>(null);
  readonly insights = signal<AiInsight[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('ai:create');

  readonly providerLabel = computed(() => this.ai.providerLabel(this.status()?.provider));

  readonly kpis = computed(() => {
    const s = this.summary();
    return [
      {
        key: 'requests',
        label: 'Total requests',
        value: s?.totalRequests ?? 0,
        icon: 'query_stats',
        tone: 'info',
      },
      {
        key: 'success',
        label: 'Successful',
        value: s?.successCount ?? 0,
        icon: 'check_circle',
        tone: 'success',
      },
      {
        key: 'conversations',
        label: 'Conversations',
        value: s?.conversations ?? 0,
        icon: 'chat',
        tone: 'purple',
      },
      {
        key: 'generations',
        label: 'Generations',
        value: s?.generations ?? 0,
        icon: 'auto_awesome',
        tone: 'warning',
      },
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      status: this.ai.getStatus(),
      summary: this.ai.getSummary(),
      insights: this.ai.getInsights(),
    }).subscribe({
      next: ({ status, summary, insights }) => {
        this.status.set(status);
        this.summary.set(summary);
        const fromSummary = summary.recentInsights ?? [];
        this.insights.set(insights.length ? insights : fromSummary);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(
          err?.error?.message || err?.message || 'Unable to load Nova overview.',
        );
        this.loading.set(false);
      },
    });
  }

  severityClass(severity: string): string {
    return `ai-status-pill ai-status-pill--${this.ai.severityClass(severity)}`;
  }
}
