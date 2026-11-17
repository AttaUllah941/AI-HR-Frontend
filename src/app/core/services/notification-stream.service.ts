import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type NotificationStreamMode = 'idle' | 'sse' | 'polling';

export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;
export const SSE_RECONNECT_BASE_MS = 1_000;
export const SSE_RECONNECT_MAX_MS = 30_000;
/** Consecutive SSE failures before giving up on SSE and polling instead. */
export const SSE_MAX_FAILURES = 3;

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Incremental SSE frame parser. Feed it text as it arrives; it returns the complete messages
 * and the unconsumed remainder (keep it and prepend it to the next chunk).
 * Comment lines (`: ping`) and messages without `data` are dropped.
 */
export function parseSseChunk(buffer: string): { messages: SseMessage[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const frames = normalized.split('\n\n');
  const rest = frames.pop() ?? '';
  const messages: SseMessage[] = [];

  for (const frame of frames) {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (!line || line.startsWith(':')) {
        continue;
      }
      const sep = line.indexOf(':');
      const field = sep === -1 ? line : line.slice(0, sep);
      const value = sep === -1 ? '' : line.slice(sep + 1).replace(/^ /, '');
      if (field === 'event') {
        event = value;
      } else if (field === 'data') {
        data.push(value);
      }
    }
    if (data.length > 0) {
      messages.push({ event, data: data.join('\n') });
    }
  }
  return { messages, rest };
}

/**
 * Tells the app when notifications changed.
 *
 * Tries Server-Sent Events at GET /notifications/stream (via fetch, because EventSource cannot
 * send the Bearer header). If the endpoint is missing (404/405/501...), not an event stream, or
 * keeps failing, it degrades to polling every minute (paused while the tab is hidden).
 * Subscribers only receive "something changed" ticks and decide what to refetch.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStreamService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly changes = new Subject<void>();

  readonly changes$: Observable<void> = this.changes.asObservable();
  readonly mode = signal<NotificationStreamMode>('idle');

  private started = false;
  private abort: AbortController | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private refreshedOnce = false;
  private readonly onVisibility = () => {
    if (this.mode() === 'polling' && document.visibilityState === 'visible') {
      this.changes.next();
    }
  };

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.failures = 0;
    this.refreshedOnce = false;
    void this.connect();
  }

  stop(): void {
    this.started = false;
    this.abort?.abort();
    this.abort = null;
    this.clearTimers();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.mode.set('idle');
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private async connect(): Promise<void> {
    if (!this.started) {
      return;
    }

    const token = this.auth.getAccessToken();
    if (!token || typeof fetch !== 'function') {
      this.startPolling();
      return;
    }

    const abort = new AbortController();
    this.abort = abort;

    try {
      const response = await fetch(`${environment.apiBaseUrl}/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: abort.signal,
      });

      if (response.status === 401 && !this.refreshedOnce) {
        this.refreshedOnce = true;
        this.auth.refresh().subscribe({
          next: () => void this.connect(),
          error: () => this.startPolling(),
        });
        return;
      }

      const isStream = (response.headers.get('content-type') ?? '').includes('text/event-stream');
      if (!response.ok || !response.body || !isStream) {
        // Endpoint not available (e.g. 404 before the backend ships it): poll instead.
        this.startPolling();
        return;
      }

      this.failures = 0;
      this.mode.set('sse');
      await this.consume(response.body, abort.signal);
      if (this.started && !abort.signal.aborted) {
        this.scheduleReconnect();
      }
    } catch {
      if (this.started && !abort.signal.aborted) {
        this.scheduleReconnect();
      }
    }
  }

  private async consume(body: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) {
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseChunk(buffer);
        buffer = parsed.rest;
        if (parsed.messages.length > 0) {
          this.changes.next();
        }
      }
    } finally {
      reader.releaseLock?.();
    }
  }

  private scheduleReconnect(): void {
    this.failures += 1;
    if (this.failures >= SSE_MAX_FAILURES) {
      this.startPolling();
      return;
    }
    const delay = Math.min(SSE_RECONNECT_BASE_MS * 2 ** (this.failures - 1), SSE_RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private startPolling(): void {
    if (!this.started || this.pollTimer !== null) {
      return;
    }
    this.mode.set('polling');
    this.pollTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        this.changes.next();
      }
    }, NOTIFICATION_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private clearTimers(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
