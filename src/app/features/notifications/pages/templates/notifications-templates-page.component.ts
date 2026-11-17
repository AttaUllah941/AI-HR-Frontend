import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  NotificationTemplate,
  NotificationsService,
} from '../../../../core/services/notifications.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { SendNotificationDialogComponent } from '../../dialogs/send-notification-dialog.component';
import { TemplateFormDialogComponent } from '../../dialogs/template-form-dialog.component';

@Component({
  selector: 'app-notifications-templates-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './notifications-templates-page.component.html',
  styleUrl: './notifications-templates-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsTemplatesPageComponent implements OnInit {
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<NotificationTemplate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly canManage = this.auth.hasPermission('notifications:manage');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.canManage) {
      this.items.set([]);
      this.error.set(null);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.notifications.listTemplates().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(
          err?.error?.message || err?.message || 'Unable to load templates.',
        );
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    if (!this.canManage) {
      return;
    }
    this.dialog
      .open(TemplateFormDialogComponent, {
        width: '36rem',
        maxWidth: '95vw',
        data: { template: null },
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.reload();
        }
      });
  }

  openEdit(template: NotificationTemplate): void {
    if (!this.canManage) {
      return;
    }
    this.dialog
      .open(TemplateFormDialogComponent, {
        width: '36rem',
        maxWidth: '95vw',
        data: { template },
      })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.reload();
        }
      });
  }

  openSend(template?: NotificationTemplate): void {
    if (!this.canManage) {
      return;
    }
    this.dialog.open(SendNotificationDialogComponent, {
      width: '32rem',
      maxWidth: '95vw',
      data: { templateCode: template?.code },
    });
  }

  deleteTemplate(template: NotificationTemplate): void {
    if (!this.canManage) {
      return;
    }
    this.confirm
      .open({
        title: 'Delete template?',
        message: `Remove template “${template.code}”? Existing notifications keep their content.`,
        confirmLabel: 'Delete',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.notifications.deleteTemplate(template.id).subscribe({
          next: () => {
            this.toast.success('Template deleted.');
            this.reload();
          },
          error: () => this.toast.error('Unable to delete template.'),
        });
      });
  }

  categoryLabel(category: string): string {
    return this.notifications.categoryLabel(category);
  }

  channelLabel(channel: string): string {
    return this.notifications.channelLabel(channel);
  }

  createdLabel(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
}
