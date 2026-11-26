import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  AiConversation,
  AiMessage,
  AiService,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { formatDateTime, formatRelative } from '../../../../core/utils/date-format';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { SmartLoaderComponent } from '../../../../shared/smart-loader/smart-loader.component';
import { LOADER_MESSAGES } from '../../../../shared/smart-loader/loader-messages';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { SkeletonComponent } from '../../../../shared/skeleton/skeleton.component';
import { renderMarkdown } from '../../../../shared/utils/markdown';

type ApiError = { error?: { message?: string }; message?: string };

/** A message plus the HTML to show for it (Nova's replies are formatted, the rest stay plain text). */
interface MessageView extends AiMessage {
  html: string | null;
}

/** Generic starting points. They do not assume what data Nova can see. */
export const STARTER_PROMPTS = [
  'How do I request leave, and who approves it?',
  'Explain how overtime is usually calculated.',
  'Suggest interview questions for a software engineer.',
  'List the steps for onboarding a new employee.',
] as const;

@Component({
  selector: 'app-ai-assistant-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    SkeletonComponent,
    EmptyStateComponent,
    OrganizationStatusComponent,
    SmartLoaderComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './ai-assistant-page.component.html',
  styleUrl: './ai-assistant-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantPageComponent implements OnInit {
  protected readonly novaMessages = LOADER_MESSAGES.nova;
  protected readonly starterPrompts = STARTER_PROMPTS;
  @ViewChild('threadEl') threadEl?: ElementRef<HTMLElement>;
  @ViewChild('composerEl') composerEl?: ElementRef<HTMLTextAreaElement>;
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

  /** Messages ready to render; Nova's replies are converted once here, not on every change detection. */
  readonly thread = computed<MessageView[]>(() =>
    this.messages().map((m) => ({
      ...m,
      html: m.role.toUpperCase() === 'ASSISTANT' ? renderMarkdown(m.content) : null,
    })),
  );
  readonly activeTitle = computed(() => {
    const conv = this.conversations().find((c) => c.id === this.activeId());
    return conv ? this.conversationTitle(conv) : 'New conversation';
  });

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
      error: (err: ApiError) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load conversations.');
        this.loading.set(false);
      },
    });
  }

  selectConversation(id: string): void {
    if (this.activeId() === id) {
      return;
    }
    this.activeId.set(id);
    this.messages.set([]);
    this.loadingThread.set(true);
    this.ai.getConversation(id).subscribe({
      next: (conv) => {
        // The user may have clicked another conversation while this one was loading.
        if (this.activeId() !== id) {
          return;
        }
        this.messages.set(conv.messages ?? []);
        this.loadingThread.set(false);
        this.scrollThread();
      },
      error: () => {
        if (this.activeId() !== id) {
          return;
        }
        this.toast.error('Unable to load conversation.');
        this.loadingThread.set(false);
      },
    });
  }

  startNewChat(): void {
    this.activeId.set(null);
    this.messages.set([]);
    this.loadingThread.set(false);
    this.draft.set('');
    this.focusComposer();
  }

  /** Puts a starter prompt in the composer so it can be edited before sending. */
  useStarter(prompt: string): void {
    this.draft.set(prompt);
    this.focusComposer();
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
          this.sending.set(false);
          this.reloadConversationsQuiet();
          // Only show the reply if the user is still looking at the conversation it belongs to.
          if (this.activeId() !== conversationId) {
            return;
          }
          this.activeId.set(result.conversation.id);
          this.messages.set(result.messages);
          this.scrollThread();
        },
        error: (err: ApiError) => {
          this.sending.set(false);
          if (this.activeId() === conversationId) {
            this.messages.update((list) => list.filter((m) => m.id !== optimistic.id));
            this.draft.set(text);
          }
          this.toast.error(err?.error?.message || err?.message || 'Nova could not reply. Try again.');
        },
      });
  }

  deleteConversation(conv: AiConversation): void {
    if (!this.canDelete) {
      return;
    }
    this.confirm
      .open({
        title: 'Delete conversation?',
        message: `Delete “${this.conversationTitle(conv)}” from your Nova history? This can't be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.ai.deleteConversation(conv.id).subscribe({
          next: () => {
            this.toast.success('Conversation deleted.');
            if (this.activeId() === conv.id) {
              this.startNewChat();
            }
            this.reloadConversationsQuiet();
          },
          error: () => this.toast.error('Unable to delete conversation.'),
        });
      });
  }

  async copyReply(message: AiMessage): Promise<void> {
    try {
      await navigator.clipboard.writeText(message.content);
      this.toast.success('Reply copied.');
    } catch {
      this.toast.error('Could not copy. Select the text and copy it manually.');
    }
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

  timeAgo(iso: string): string {
    return formatRelative(iso, '');
  }

  fullTime(iso: string): string {
    return formatDateTime(iso);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    // Enter sends, Shift+Enter adds a line. Do not send while an IME is composing a character.
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
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

  private focusComposer(): void {
    queueMicrotask(() => this.composerEl?.nativeElement.focus());
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
