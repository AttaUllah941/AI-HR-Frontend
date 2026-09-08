import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  NOTIFICATION_CATEGORIES,
  NotificationItem,
  NotificationsService,
  NotificationsSummary,
} from '../../../../core/services/notifications.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { SendNotificationDialogComponent } from '../../dialogs/send-notification-dialog.component';

@Component({
  selector: 'app-notifications-inbox-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './notifications-inbox-page.component.html',
  styleUrl: './notifications-inbox-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsInboxPageComponent implements OnInit {
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<NotificationItem[]>([]);
  readonly summary = signal<NotificationsSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly total = signal(0);
  readonly totalPages = signal(1);

  readonly canManage = this.auth.hasPermission('notifications:manage');
  readonly categories = NOTIFICATION_CATEGORIES;

  readonly category = new FormControl<string>('', { nonNullable: true });
  readonly unreadOnly = new FormControl(false, { nonNullable: true });

  readonly unreadCount = computed(() => this.summary()?.unreadCount ?? 0);

  readonly categoryChips = computed(() => {
    const unread = this.summary()?.unreadByCategory ?? {};
    return this.categories
      .map((category) => ({
        category,
        label: this.notifications.categoryLabel(category),
        unread: unread[category] ?? 0,
      }))
      .filter((row) => row.unread > 0)
      .slice(0, 4);
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notifications.getSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
    this.notifications
      .list({
        category: this.category.value || undefined,
        unreadOnly: this.unreadOnly.value || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(
            err?.error?.message || err?.message || 'Unable to load notifications.',
          );
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    this.reload();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.reload();
  }

  markRead(item: NotificationItem): void {
    if (this.notifications.isRead(item)) {
      return;
    }
    this.notifications.markRead(item.id).subscribe({
      next: () => {
        this.toast.success('Marked as read.');
        this.reload();
      },
      error: () => this.toast.error('Unable to mark as read.'),
    });
  }

  markAllRead(): void {
    this.confirm
      .open({
        title: 'Mark all as read?',
        message: 'All unread notifications in your inbox will be marked as read.',
        confirmLabel: 'Mark all read',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.notifications.markAllRead().subscribe({
          next: (res) => {
            this.toast.success(
              res.updated ? `${res.updated} notification(s) marked read.` : 'Nothing to update.',
            );
            this.reload();
          },
          error: () => this.toast.error('Unable to mark all as read.'),
        });
      });
  }

  deleteItem(item: NotificationItem): void {
    this.confirm
      .open({
        title: 'Delete notification?',
        message: 'This removes the notification from your inbox.',
        confirmLabel: 'Delete',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.notifications.deleteOne(item.id).subscribe({
          next: () => {
            this.toast.success('Notification deleted.');
            this.reload();
          },
          error: () => this.toast.error('Unable to delete notification.'),
        });
      });
  }

  openSendDialog(): void {
    if (!this.canManage) {
      return;
    }
    this.dialog
      .open(SendNotificationDialogComponent, { width: '32rem', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((sent) => {
        if (sent) {
          this.reload();
        }
      });
  }

  isRead(item: NotificationItem): boolean {
    return this.notifications.isRead(item);
  }

  categoryLabel(category: string): string {
    return this.notifications.categoryLabel(category);
  }

  channelLabel(channel: string): string {
    return this.notifications.channelLabel(channel);
  }

  statusLabel(status: string): string {
    return this.notifications.statusLabel(status);
  }

  statusClass(status: string): string {
    return `notifications-status-pill notifications-status-pill--${this.notifications.statusTone(status)}`;
  }

  relativeTime(iso: string): string {
    return this.notifications.relativeTime(iso);
  }
}
