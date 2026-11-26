import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  AiChatResult,
  AiConversation,
  AiMessage,
  AiService,
} from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AiAssistantPageComponent, STARTER_PROMPTS } from './ai-assistant-page.component';

const conv = (id: string, title: string): AiConversation => ({ id, title, createdAt: '2026-01-01T00:00:00.000Z' });
const msg = (id: string, role: AiMessage['role'], content: string): AiMessage => ({
  id,
  conversationId: 'c1',
  role,
  content,
  createdAt: '2026-01-01T00:00:00.000Z',
});

interface Setup {
  threads?: Record<string, Observable<{ messages: AiMessage[] }>>;
  chat?: Subject<AiChatResult>;
}

async function setup(options: Setup = {}) {
  const deleted: string[] = [];
  TestBed.configureTestingModule({
    imports: [AiAssistantPageComponent],
    providers: [
      { provide: AuthService, useValue: { hasPermission: () => true } },
      { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      { provide: ConfirmDialogService, useValue: { open: () => of(true) } },
      {
        provide: AiService,
        useValue: {
          listConversations: () => of([conv('c1', 'First chat'), conv('c2', 'Second chat')]),
          getConversation: (id: string) => options.threads?.[id] ?? of({ messages: [] }),
          chat: () => options.chat ?? of(undefined),
          deleteConversation: (id: string) => {
            deleted.push(id);
            return of({ id, deleted: true });
          },
        },
      },
    ],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(AiAssistantPageComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const select = (i: number) => {
    el.querySelectorAll<HTMLButtonElement>('.ai-chat-conv__select')[i]!.click();
    fixture.detectChanges();
  };
  return { fixture, component: fixture.componentInstance, el, deleted, select };
}

describe('AiAssistantPageComponent', () => {
  it('formats Nova replies, keeps your own messages as plain text, and never renders markup', async () => {
    const thread = of({
      messages: [
        msg('m1', 'USER', '<b>hi</b> *there*'),
        msg('m2', 'ASSISTANT', '## Steps\n\n- one\n- **two**\n\n<img src=x onerror=alert(1)>'),
      ],
    });
    const { el, select } = await setup({ threads: { c1: thread } });
    select(0);

    const user = el.querySelector('.ai-chat-bubble--user')!;
    expect(user.querySelector('b')).toBeNull();
    expect(user.textContent).toContain('<b>hi</b> *there*');

    const prose = el.querySelector('.ai-chat-prose')!;
    expect(prose.querySelectorAll('li').length).toBe(2);
    expect(prose.querySelector('strong')?.textContent).toBe('two');
    expect(prose.querySelector('img')).toBeNull();
    expect(prose.textContent).toContain('<img');
  });

  it('keeps selecting and deleting as two separate, labelled buttons', async () => {
    const { el, deleted, fixture } = await setup();
    const row = el.querySelector('.ai-chat-conv')!;
    expect(row.querySelectorAll('button').length).toBe(2);
    expect(row.querySelector('.ai-chat-conv__select')?.querySelector('button')).toBeNull();

    const del = row.querySelector<HTMLButtonElement>('.ai-chat-conv__delete')!;
    expect(del.getAttribute('aria-label')).toBe('Delete conversation: First chat');
    del.click();
    fixture.detectChanges();
    expect(deleted).toEqual(['c1']);
  });

  it('ignores a slow conversation load once another conversation has been opened', async () => {
    const slow = new Subject<{ messages: AiMessage[] }>();
    const { fixture, component, el, select } = await setup({
      threads: { c1: slow, c2: of({ messages: [{ ...msg('m9', 'ASSISTANT', 'from second'), conversationId: 'c2' }] }) },
    });
    select(0);
    select(1);
    expect(el.textContent).toContain('from second');

    slow.next({ messages: [msg('m1', 'ASSISTANT', 'late reply from first')] });
    fixture.detectChanges();

    expect(component.activeId()).toBe('c2');
    expect(el.textContent).toContain('from second');
    expect(el.textContent).not.toContain('late reply from first');
  });

  it('does not drop a reply into a conversation the user has since left', async () => {
    const chat = new Subject<AiChatResult>();
    const { fixture, component, el, select } = await setup({
      chat,
      threads: { c2: of({ messages: [{ ...msg('m9', 'ASSISTANT', 'second thread'), conversationId: 'c2' }] }) },
    });
    component.startNewChat();
    component.draft.set('Question for a new chat');
    component.send();
    select(1);

    chat.next({ conversation: conv('c3', 'New'), messages: [msg('m5', 'ASSISTANT', 'answer to the new chat')] });
    fixture.detectChanges();

    expect(component.activeId()).toBe('c2');
    expect(el.textContent).toContain('second thread');
    expect(el.textContent).not.toContain('answer to the new chat');
  });

  it('fills the composer from a starter prompt without sending it', async () => {
    const { fixture, component, el } = await setup();
    const first = el.querySelector<HTMLButtonElement>('.ai-chat-starter')!;
    first.click();
    fixture.detectChanges();
    expect(component.draft()).toBe(STARTER_PROMPTS[0]);
    expect(component.sending()).toBe(false);
  });
});
