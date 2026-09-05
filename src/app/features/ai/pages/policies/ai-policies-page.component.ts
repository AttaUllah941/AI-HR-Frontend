import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  AiGeneration,
  AiPolicyTone,
  AiService,
  PolicyDraft,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-ai-policies-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './ai-policies-page.component.html',
  styleUrl: './ai-policies-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPoliciesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly items = signal<AiGeneration[]>([]);
  readonly draft = signal<PolicyDraft | null>(null);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('ai:create');
  readonly canDelete = this.auth.hasPermission('ai:delete');
  readonly tones: AiPolicyTone[] = ['formal', 'friendly', 'strict'];

  readonly form = this.fb.nonNullable.group({
    topic: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    audience: [''],
    tone: ['formal' as AiPolicyTone],
    additionalContext: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.ai.listGenerations({ feature: 'POLICY', page: 1, pageSize: 50 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        if (!this.draft() && res.items[0]) {
          this.selectGeneration(res.items[0]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load policy generations.');
        this.loading.set(false);
      },
    });
  }

  generate(): void {
    if (!this.canCreate || this.form.invalid || this.generating()) {
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
          this.selectGeneration(generation);
          this.generating.set(false);
          this.reload();
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(
            err?.error?.message || err?.message || 'Policy generation failed.',
          );
          this.generating.set(false);
        },
      });
  }

  selectGeneration(generation: AiGeneration): void {
    this.draft.set(this.ai.normalizePolicyOutput(generation.output));
  }

  deleteGeneration(id: string): void {
    if (!this.canDelete) {
      return;
    }
    this.confirm
      .open({
        title: 'Delete policy draft?',
        message: 'This removes the generated policy from history.',
        confirmLabel: 'Delete',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.ai.deleteGeneration(id).subscribe({
          next: () => {
            this.toast.success('Policy draft deleted.');
            this.draft.set(null);
            this.reload();
          },
          error: () => this.toast.error('Unable to delete policy draft.'),
        });
      });
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

  topicPreview(item: AiGeneration): string {
    const input = item.input as Record<string, unknown> | null;
    if (input && typeof input['topic'] === 'string') {
      return input['topic'];
    }
    return this.ai.normalizePolicyOutput(item.output).topic ?? 'Policy draft';
  }
}
