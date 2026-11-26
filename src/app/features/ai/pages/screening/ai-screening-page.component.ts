import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  AiGeneration,
  AiService,
  ScreeningScorecard,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ScreeningRunDialogComponent } from '../../dialogs/screening-run-dialog.component';
import { formatDateTime } from '../../../../core/utils/date-format';
import { generationStatusLabel, screeningSubject } from '../../utils/generation-view';

@Component({
  selector: 'app-ai-screening-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, EmptyStateComponent, OrganizationStatusComponent],
  templateUrl: './ai-screening-page.component.html',
  styleUrl: './ai-screening-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiScreeningPageComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<AiGeneration[]>([]);
  readonly selected = signal<AiGeneration | null>(null);
  readonly scorecard = signal<ScreeningScorecard | null>(null);
  readonly loading = signal(true);
  /** True once the first load finished, so a reload after a run or delete keeps the page on screen. */
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('ai:create');
  readonly canDelete = this.auth.hasPermission('ai:delete');

  readonly selectedSubject = computed(() => {
    const generation = this.selected();
    return generation ? screeningSubject(generation) : null;
  });

  protected readonly subjectOf = screeningSubject;
  protected readonly statusLabel = generationStatusLabel;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.ai.listGenerations({ feature: 'RESUME_SCREENING', page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        const current = this.selected();
        if (current) {
          const refreshed = res.items.find((g) => g.id === current.id) ?? null;
          this.selectGeneration(refreshed);
        } else if (res.items[0]) {
          this.selectGeneration(res.items[0]);
        }
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => {
        this.error.set('Unable to load screening results.');
        this.loading.set(false);
      },
    });
  }

  openRun(): void {
    this.dialog
      .open(ScreeningRunDialogComponent, {
        data: {},
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((generation: AiGeneration | null | undefined) => {
        if (generation) {
          this.reload();
          this.selectGeneration(generation);
        }
      });
  }

  selectGeneration(generation: AiGeneration | null): void {
    this.selected.set(generation);
    this.scorecard.set(generation ? this.ai.normalizeScreeningOutput(generation.output) : null);
  }

  deleteGeneration(item: AiGeneration): void {
    if (!this.canDelete) {
      return;
    }
    const subject = screeningSubject(item);
    this.confirm
      .open({
        title: 'Delete screening?',
        message: `Delete the screening for ${subject.name} from history? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.ai.deleteGeneration(item.id).subscribe({
          next: () => {
            this.toast.success('Screening deleted.');
            if (this.selected()?.id === item.id) {
              this.selectGeneration(null);
            }
            this.reload();
          },
          error: () => this.toast.error('Unable to delete screening.'),
        });
      });
  }

  scoreFor(item: AiGeneration): number | string {
    return this.ai.normalizeScreeningOutput(item.output).score ?? '—';
  }

  createdLabel(iso: string | undefined): string {
    if (!iso) {
      return '—';
    }
    try {
      return formatDateTime(iso);
    } catch {
      return iso;
    }
  }
}
