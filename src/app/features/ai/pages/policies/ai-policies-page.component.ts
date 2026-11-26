import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AiGeneration, AiPolicyTone, AiService } from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatDateTime } from '../../../../core/utils/date-format';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LOADER_MESSAGES } from '../../../../shared/smart-loader/loader-messages';
import { SmartLoaderComponent } from '../../../../shared/smart-loader/smart-loader.component';
import { downloadBlob } from '../../../../shared/utils/download-blob';
import { renderMarkdown } from '../../../../shared/utils/markdown';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

/** How many past drafts the history lists (the API's newest first). */
const HISTORY_SIZE = 50;

type ApiError = { error?: { message?: string }; message?: string };

@Component({
  selector: 'app-ai-policies-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    SmartLoaderComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './ai-policies-page.component.html',
  styleUrl: './ai-policies-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPoliciesPageComponent implements OnInit {
  protected readonly generationMessages = LOADER_MESSAGES.generation;
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly items = signal<AiGeneration[]>([]);
  readonly total = signal(0);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('ai:create');
  readonly canDelete = this.auth.hasPermission('ai:delete');

  readonly tones: ReadonlyArray<{ value: AiPolicyTone; label: string }> = [
    { value: 'formal', label: 'Formal' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'strict', label: 'Strict' },
  ];

  /** Limits mirror the API's validation so users see them before the request fails. */
  readonly limits = { topic: 200, audience: 100, additionalContext: 3000 } as const;

  readonly form = this.fb.nonNullable.group({
    topic: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(this.limits.topic)],
    ],
    audience: ['', Validators.maxLength(this.limits.audience)],
    tone: ['formal' as AiPolicyTone],
    additionalContext: ['', Validators.maxLength(this.limits.additionalContext)],
  });

  readonly selected = computed(() => this.items().find((item) => item.id === this.selectedId()) ?? null);
  private readonly draft = computed(() => {
    const generation = this.selected();
    return generation ? this.ai.normalizePolicyOutput(generation.output) : null;
  });
  readonly title = computed(() => {
    const generation = this.selected();
    return generation ? (this.draft()?.topic || this.topicPreview(generation)) : '';
  });
  readonly markdown = computed(() => this.draft()?.markdown ?? '');
  /** Safe to bind with [innerHTML]: the renderer escapes the AI text and emits no links or raw HTML. */
  readonly html = computed(() => renderMarkdown(this.markdown()));
  readonly failed = computed(() => this.selected()?.status === 'FAILED');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.ai.listGenerations({ feature: 'POLICY', page: 1, pageSize: HISTORY_SIZE }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.pagination?.total ?? res.items.length);
        if (!this.selected() && res.items[0]) {
          this.selectedId.set(res.items[0].id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load policy drafts.');
        this.loading.set(false);
      },
    });
  }

  generate(): void {
    if (!this.canCreate || this.generating()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating.set(true);
    const raw = this.form.getRawValue();
    this.ai
      .generatePolicy({
        topic: raw.topic.trim(),
        audience: raw.audience.trim() || null,
        tone: raw.tone,
        additionalContext: raw.additionalContext.trim() || null,
      })
      .subscribe({
        next: (generation) => {
          this.toast.success('Policy draft generated.');
          // Add it to the history here instead of reloading, so the page does not flash.
          this.items.update((list) => [generation, ...list.filter((i) => i.id !== generation.id)]);
          this.total.update((n) => n + 1);
          this.selectedId.set(generation.id);
          this.generating.set(false);
        },
        error: (err: ApiError) => {
          this.toast.error(err?.error?.message || err?.message || 'Policy generation failed.');
          this.generating.set(false);
        },
      });
  }

  select(generation: AiGeneration): void {
    this.selectedId.set(generation.id);
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.markdown());
      this.toast.success('Policy text copied.');
    } catch {
      this.toast.error('Could not copy. Select the text and copy it manually.');
    }
  }

  download(): void {
    const slug =
      this.title()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'policy-draft';
    downloadBlob(new Blob([this.markdown()], { type: 'text/markdown;charset=utf-8' }), `${slug}.md`);
  }

  deleteGeneration(item: AiGeneration): void {
    if (!this.canDelete || this.deletingId()) {
      return;
    }
    this.confirm
      .open({
        title: 'Delete policy draft?',
        message: `Delete “${this.topicPreview(item)}” from the history? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.ai.deleteGeneration(item.id).subscribe({
          next: () => {
            const remaining = this.items().filter((i) => i.id !== item.id);
            this.items.set(remaining);
            this.total.update((n) => Math.max(0, n - 1));
            if (this.selectedId() === item.id) {
              this.selectedId.set(remaining[0]?.id ?? null);
            }
            this.deletingId.set(null);
            this.toast.success('Policy draft deleted.');
          },
          error: (err: ApiError) => {
            this.deletingId.set(null);
            this.toast.error(err?.error?.message || err?.message || 'Unable to delete policy draft.');
          },
        });
      });
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

  topicPreview(item: AiGeneration): string {
    const input = item.input as Record<string, unknown> | null;
    if (input && typeof input['topic'] === 'string') {
      return input['topic'];
    }
    return this.ai.normalizePolicyOutput(item.output).topic ?? 'Policy draft';
  }
}
