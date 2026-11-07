import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import {
  NOTIFICATION_POLL_INTERVAL_MS,
  NotificationStreamService,
  parseSseChunk,
} from './notification-stream.service';

describe('parseSseChunk', () => {
  it('parses complete frames and returns the remainder', () => {
    const { messages, rest } = parseSseChunk('event: notification\ndata: {"a":1}\n\ndata: part');
    expect(messages).toEqual([{ event: 'notification', data: '{"a":1}' }]);
    expect(rest).toBe('data: part');
  });

  it('joins multi-line data and handles CRLF', () => {
    const { messages } = parseSseChunk('data: one\r\ndata: two\r\n\r\n');
    expect(messages).toEqual([{ event: 'message', data: 'one\ntwo' }]);
  });

  it('ignores comments (heartbeats) and frames without data', () => {
    const { messages } = parseSseChunk(': ping\n\nevent: x\n\n');
    expect(messages).toEqual([]);
  });
});

function streamResponse(chunks: string[], status = 200, contentType = 'text/event-stream') {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

describe('NotificationStreamService', () => {
  let service: NotificationStreamService;
  let ticks: number;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getAccessToken: () => 'token', refresh: vi.fn() } },
      ],
    });
    service = TestBed.inject(NotificationStreamService);
    ticks = 0;
    service.changes$.subscribe(() => (ticks += 1));
  });

  afterEach(() => {
    service.stop();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('degrades to polling when the stream endpoint 404s', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 404 })));
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.mode()).toBe('polling');

    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 2);
    expect(ticks).toBe(2);
  });

  it('degrades to polling when the response is not an event stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(streamResponse([], 200, 'text/html')),
    );
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.mode()).toBe('polling');
  });

  it('emits a change for each SSE message and ignores heartbeats', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamResponse([': ping\n\n', 'event: notification\ndata: {"id":"1"}\n\n']),
      ),
    );
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(ticks).toBe(1);
  });

  it('sends the bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer token');
  });

  it('falls back to polling after repeated stream failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    service.start();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(service.mode()).toBe('polling');
  });

  it('stop() ends polling and resets the mode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    service.stop();
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 3);
    expect(ticks).toBe(0);
    expect(service.mode()).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
  });
});
