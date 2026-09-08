import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  AiConversation,
  AiMessage,
  AiService,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-ai-assistant-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './ai-assistant-page.component.html',
  styleUrl: './ai-assistant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantPageComponent implements OnInit {
  @ViewChild('threadEl') threadEl?: ElementRef<HTMLElement>;

  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly conversations = signal<AiConversation[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly messages = signal<AiMessage[]>([]);
  readonly draft = signal('');
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly loadingThread = signal(false);
  readonly error = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('ai:create');
  readonly canDelete = this.auth.hasPermission('ai:delete');

  ngOnInit(): void {
    this.reloadConversations();
  }

  reloadConversations(): void {
    this.loading.set(true);
    this.error.set(null);
    this.ai.listConversations().subscribe({
      next: (items) => {
        this.conversations.set(items);
        this.loading.set(false);
        const active = this.activeId();
        if (active && !items.some((c) => c.id === active)) {
          this.activeId.set(null);
          this.messages.set([]);
        }
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(
          err?.error?.message || err?.message || 'Unable to load conversations.',
        );
        this.loading.set(false);
      },
    });
  }

  selectConversation(id: string): void {
    if (this.activeId() === id) {
      return;
    }
    this.activeId.set(id);
    this.loadingThread.set(true);
    this.ai.getConversation(id).subscribe({
      next: (conv) => {
        this.messages.set(conv.messages ?? []);
        this.loadingThread.set(false);
        this.scrollThread();
      },
      error: () => {
        this.toast.error('Unable to load conversation.');
        this.loadingThread.set(false);
      },
    });
  }

  startNewChat(): void {
    this.activeId.set(null);
    this.messages.set([]);
    this.draft.set('');
  }

  send(): void {
    if (!this.canCreate || this.sending()) {
      return;
    }
    const text = this.draft().trim();
    if (!text) {
      return;
    }

    this.sending.set(true);
    const conversationId = this.activeId();
    const optimistic: AiMessage = {
      id: `tmp-user-${Date.now()}`,
      conversationId: conversationId ?? '',
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    this.messages.update((list) => [...list, optimistic]);
    this.draft.set('');
    this.scrollThread();

    this.ai
      .chat({
        conversationId: conversationId || undefined,
        message: text,
        title: conversationId ? undefined : text.slice(0, 80),
      })
      .subscribe({
        next: (result) => {
          this.activeId.set(result.conversation.id);
          this.messages.set(result.messages);
          this.sending.set(false);
          this.reloadConversationsQuiet();
          this.scrollThread();
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.messages.update((list) => list.filter((m) => m.id !== optimistic.id));
          this.draft.set(text);
          this.toast.error(
            err?.error?.message || err?.message || 'Nova could not reply. Try again.',
          );
          this.sending.set(false);
        },
      });
  }

  deleteConversation(event: Event, id: string): void {
    event.stopPropagation();
    if (!this.canDelete) {
      return;
    }
    this.confirm
      .open({
        title: 'Delete conversation?',
        message: 'This removes the chat from your Nova history.',
        confirmLabel: 'Delete',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.ai.deleteConversation(id).subscribe({
          next: () => {
            this.toast.success('Conversation deleted.');
            if (this.activeId() === id) {
              this.startNewChat();
            }
            this.reloadConversationsQuiet();
          },
          error: () => this.toast.error('Unable to delete conversation.'),
        });
      });
  }

  conversationTitle(conv: AiConversation): string {
    return conv.title?.trim() || 'Untitled chat';
  }

  bubbleClass(role: string): string {
    const r = role.toUpperCase();
    if (r === 'USER') {
      return 'ai-chat-bubble ai-chat-bubble--user';
    }
    if (r === 'SYSTEM') {
      return 'ai-chat-bubble ai-chat-bubble--system';
    }
    return 'ai-chat-bubble ai-chat-bubble--assistant';
  }

  roleLabel(role: string): string {
    const r = role.toUpperCase();
    if (r === 'USER') {
      return 'You';
    }
    if (r === 'SYSTEM') {
      return 'System';
    }
    return 'Nova';
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private reloadConversationsQuiet(): void {
    this.ai.listConversations().subscribe({
      next: (items) => this.conversations.set(items),
      error: () => undefined,
    });
  }

  private scrollThread(): void {
    queueMicrotask(() => {
      const el = this.threadEl?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
