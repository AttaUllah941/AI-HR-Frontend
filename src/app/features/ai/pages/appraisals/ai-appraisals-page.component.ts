import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  AiGeneration,
  AiService,
  AppraisalDraft,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { AppraisalRunDialogComponent } from '../../dialogs/appraisal-run-dialog.component';

@Component({
  selector: 'app-ai-appraisals-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './ai-appraisals-page.component.html',
  styleUrl: './ai-appraisals-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAppraisalsPageComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<AiGeneration[]>([]);
  readonly selected = signal<AiGeneration | null>(null);
  readonly draft = signal<AppraisalDraft | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('ai:create');
  readonly canDelete = this.auth.hasPermission('ai:delete');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.ai.listGenerations({ feature: 'APPRAISAL', page: 1, pageSize: 50 }).subscribe({
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
      },
      error: () => {
        this.error.set('Unable to load appraisal drafts.');
        this.loading.set(false);
      },
    });
  }

  openRun(): void {
    this.dialog
      .open(AppraisalRunDialogComponent, {
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
    this.draft.set(generation ? this.ai.normalizeAppraisalOutput(generation.output) : null);
  }

  deleteGeneration(id: string): void {
    if (!this.canDelete) {
      return;
    }
    this.confirm
      .open({
        title: 'Delete appraisal draft?',
        message: 'This removes the generated appraisal from history.',
        confirmLabel: 'Delete',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.ai.deleteGeneration(id).subscribe({
          next: () => {
            this.toast.success('Appraisal draft deleted.');
            if (this.selected()?.id === id) {
              this.selectGeneration(null);
            }
            this.reload();
          },
          error: () => this.toast.error('Unable to delete appraisal.'),
        });
      });
  }

  ratingFor(item: AiGeneration): number | string {
    return this.ai.normalizeAppraisalOutput(item.output).overallRating ?? '—';
  }

  createdLabel(iso: string | undefined): string {
    if (!iso) {
      return '—';
    }
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
}
