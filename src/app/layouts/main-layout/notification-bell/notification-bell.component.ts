import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';
import {
  DashboardNotificationItem,
  DashboardService,
} from '../../../core/services/dashboard.service';
import { NotificationStreamService } from '../../../core/services/notification-stream.service';
import {
  NotificationFeedItem,
  NotificationsService,
} from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DatePipe, RouterLink, MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly notificationsApi = inject(NotificationsService);
  private readonly stream = inject(NotificationStreamService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly notifications = signal<Array<DashboardNotificationItem | NotificationFeedItem>>([]);
  readonly notificationCount = signal(0);

  ngOnInit(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.loadNotifications(false);

    // Live updates: SSE when the backend supports it, otherwise a visibility-aware poll.
    this.stream.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadNotifications(true));
    this.stream.start();
    this.destroyRef.onDestroy(() => this.stream.stop());
  }

  private loadNotifications(background: boolean): void {
    this.notificationsApi
      .getFeed(8, { background })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.notifications.set(data.items);
          this.notificationCount.set(data.unreadCount);
        },
        error: () => {
          this.dashboard.getNotifications().subscribe({
            next: (data) => {
              this.notifications.set(data.items);
              this.notificationCount.set(data.unreadCount);
            },
            error: () => {
              this.notifications.set([]);
              this.notificationCount.set(0);
            },
          });
        },
      });
  }

  onNotificationClick(item: DashboardNotificationItem | NotificationFeedItem): void {
    const isFeedItem = 'category' in item;
    if (!item.read && isFeedItem) {
      this.notificationsApi.markRead(item.id).subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
          );
          this.notificationCount.update((count) => Math.max(0, count - 1));
        },
        error: () => undefined,
      });
    }
    void this.router.navigate(['/notifications/inbox']);
  }

  markAllNotificationsRead(): void {
    if (!this.notificationCount()) {
      return;
    }
    this.notificationsApi.markAllRead().subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
        this.notificationCount.set(0);
        this.toast.success('All notifications marked read.');
      },
      error: () => {
        this.toast.error('Unable to mark notifications as read.');
      },
    });
  }
}
