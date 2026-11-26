import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { displayPerson, mustPickOption, pickedId } from '../../../shared/forms/person-picker';
import { SendNotificationDialogComponent, SendNotificationDialogData } from './send-notification-dialog.component';

const ME = { id: 'me1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };

async function setup(data: SendNotificationDialogData = {}) {
  const sent: Array<Record<string, unknown>> = [];
  const closed: unknown[] = [];
  TestBed.configureTestingModule({
    imports: [SendNotificationDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: (v: unknown) => closed.push(v), backdropClick: () => of(), keydownEvents: () => of(), disableClose: false } },
      { provide: AuthService, useValue: { user: () => ME } },
      { provide: ToastService, useValue: { success: () => undefined, info: () => undefined, error: () => undefined } },
      { provide: SettingsService, useValue: { listUsers: () => of({ items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 } }) } },
      {
        provide: NotificationsService,
        useValue: {
          categoryLabel: (c: string) => c,
          channelLabel: (c: string) => c,
          send: (body: Record<string, unknown>) => {
            sent.push(body);
            return of({ count: 1, skippedChannels: [] });
          },
        },
      },
    ],
  });
  await TestBed.compileComponents();
  const fixture = TestBed.createComponent(SendNotificationDialogComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, sent, closed };
}

describe('person picker helpers', () => {
  it('treats loose typed text as invalid and a chosen option or empty value as valid', () => {
    const control = (value: unknown) => ({ value }) as never;
    expect(mustPickOption(control('ada'))).toEqual({ notSelected: true });
    expect(mustPickOption(control(''))).toBeNull();
    expect(mustPickOption(control({ id: '1', name: 'Ada', detail: '' }))).toBeNull();
  });

  it('reads the id and display name only from a chosen option', () => {
    expect(pickedId({ id: '1', name: 'Ada', detail: '' })).toBe('1');
    expect(pickedId('ada')).toBeUndefined();
    expect(pickedId(null)).toBeUndefined();
    expect(displayPerson({ id: '1', name: 'Ada', detail: '' })).toBe('Ada');
    expect(displayPerson('ada')).toBe('');
  });
});

describe('SendNotificationDialogComponent', () => {
  it('starts on the sender with an empty title and message', async () => {
    const { component } = await setup();
    expect(pickedId(component.recipient.value)).toBe('me1');
    expect(component.form.controls.title.value).toBe('');
    expect(component.form.controls.body.value).toBe('');
  });

  it('prefills test text only when opened as a test', async () => {
    const { component } = await setup({ prefillTest: true, templateCode: 'LEAVE_APPROVED' });
    expect(component.form.controls.title.value).toBe('Test notification');
    expect(component.form.controls.templateCode.value).toBe('LEAVE_APPROVED');
  });

  it('does not send until the message is filled in and a person is chosen', async () => {
    const { fixture, component, sent, el } = await setup();
    component.submit();
    fixture.detectChanges();
    expect(sent.length).toBe(0);
    expect(el.textContent).toContain('Enter a title');

    component.recipient.setValue('typed but not picked');
    component.form.patchValue({ title: 'Hello', body: 'World' });
    component.submit();
    expect(sent.length).toBe(0);
  });

  it('sends the chosen recipient id and closes', async () => {
    const { component, sent, closed } = await setup();
    component.form.patchValue({ title: ' Hello ', body: ' World ' });
    component.submit();
    expect(sent).toEqual([
      { userId: 'me1', title: 'Hello', body: 'World', category: 'SYSTEM', channels: ['IN_APP'], templateCode: undefined },
    ]);
    expect(closed).toEqual([true]);
  });
});
