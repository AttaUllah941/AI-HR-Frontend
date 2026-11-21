import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter, Subscription, forkJoin } from 'rxjs';
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
import { NotificationStreamService } from '../../../../core/services/notification-stream.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { SendNotificationDialogComponent } from '../../dialogs/send-notification-dialog.component';
import { optimistic } from '../../../../core/utils/optimistic';

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
  private inflight: Subscription | null = null;
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly stream = inject(NotificationStreamService);
  private readonly destroyRef = inject(DestroyRef);

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
    // Live: a new notification refreshes the list in place (no spinner, keeps filters and page).
    this.stream.changes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload(true));
  }

  reload(quiet = false): void {
    if (!quiet) {
      this.loading.set(true);
    }
    this.error.set(null);
    this.notifications.getSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
    this.inflight?.unsubscribe();
    this.inflight = this.notifications
      .list({
        category: this.category.value || undefined,
        channel: 'IN_APP',
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
          if (quiet) {
            return; // keep what is on screen; the next tick or reload will retry
          }
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

  filterByCategory(category: string): void {
    this.category.setValue(category);
    this.applyFilters();
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

  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly unreadItems = computed(() => this.items().filter((n) => !this.notifications.isRead(n)));
  readonly selectedUnread = computed(() =>
    this.unreadItems().filter((n) => this.selected().has(n.id)),
  );
  readonly allSelected = computed(
    () => this.unreadItems().length > 0 && this.selectedUnread().length === this.unreadItems().length,
  );

  toggleSelected(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  toggleAll(): void {
    this.selected.set(
      this.allSelected() ? new Set() : new Set(this.unreadItems().map((n) => n.id)),
    );
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  /** Marks every selected notification read at once; rolls all of them back if any request fails. */
  markSelectedRead(): void {
    const targets = this.selectedUnread();
    if (targets.length === 0) {
      return;
    }
    const ids = new Set(targets.map((n) => n.id));
    const before = this.items();
    optimistic({
      apply: () => {
        const readAt = new Date().toISOString();
        this.items.update((list) =>
          list.map((n) => (ids.has(n.id) ? { ...n, status: 'READ', readAt } : n)),
        );
        this.clearSelection();
      },
      rollback: () => this.items.set(before),
      request$: forkJoin(targets.map((n) => this.notifications.markRead(n.id))),
      onSuccess: () => {
        this.toast.success(`${targets.length} notification(s) marked as read.`);
        this.reload();
      },
      onError: () => this.toast.error('Unable to mark the selected notifications as read.'),
    });
  }

  markRead(item: NotificationItem): void {
    if (this.notifications.isRead(item)) {
      return;
    }
    const patch = (changes: Partial<NotificationItem>) =>
      this.items.update((list) => list.map((n) => (n.id === item.id ? { ...n, ...changes } : n)));
    optimistic({
      apply: () => patch({ status: 'READ', readAt: new Date().toISOString() }),
      rollback: () => patch({ status: item.status, readAt: item.readAt }),
      request$: this.notifications.markRead(item.id),
      // Refetch quietly so unread counters stay accurate.
      onSuccess: () => this.reload(),
      onError: () => this.toast.error('Unable to mark as read.'),
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
