import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  JobOffer,
  OfferStatus,
  RecruitmentService,
} from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { OfferFormDialogComponent } from '../../dialogs/offer-form-dialog.component';

const STATUS_OPTIONS: Array<{ value: OfferStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Sent' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'EXPIRED', label: 'Expired' },
];

@Component({
  selector: 'app-recruitment-offers-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './recruitment-offers-page.component.html',
  styleUrl: './recruitment-offers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentOffersPageComponent implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<JobOffer[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<JobOffer | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('recruitment:create');
  readonly canUpdate = this.auth.hasPermission('recruitment:update');
  readonly canApprove = this.auth.hasPermission('recruitment:approve');

  readonly statusOptions = STATUS_OPTIONS;
  readonly statusControl = new FormControl<OfferStatus | ''>('', { nonNullable: true });

  ngOnInit(): void {
    this.statusControl.valueChanges.subscribe(() => {
      this.page.set(1);
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.recruitment
      .listOffers({
        status: this.statusControl.value || undefined,
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
        error: () => {
          this.error.set('Unable to load offers. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(OfferFormDialogComponent, {
        data: {},
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  openEdit(item: JobOffer): void {
    this.dialog
      .open(OfferFormDialogComponent, {
        data: { offer: item },
        width: '560px',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.reload();
        }
      });
  }

  setMenuItem(item: JobOffer): void {
    this.menuItem.set(item);
  }

  send(item: JobOffer): void {
    this.confirm
      .open({
        title: 'Send offer',
        message: `Send offer "${item.title}" to the candidate?`,
        confirmLabel: 'Send',
        icon: 'send',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.sendOffer(item.id).subscribe({
          next: () => {
            this.toast.success('Offer sent');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to send offer');
          },
        });
      });
  }

  accept(item: JobOffer): void {
    this.confirm
      .open({
        title: 'Accept offer',
        message: `Mark offer "${item.title}" as accepted?`,
        confirmLabel: 'Accept',
        icon: 'check_circle',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.respondOffer(item.id, { accept: true }).subscribe({
          next: () => {
            this.toast.success('Offer accepted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to accept offer');
          },
        });
      });
  }

  decline(item: JobOffer): void {
    this.confirm
      .open({
        title: 'Decline offer',
        message: `Mark offer "${item.title}" as declined?`,
        confirmLabel: 'Decline',
        destructive: true,
        icon: 'cancel',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.respondOffer(item.id, { accept: false }).subscribe({
          next: () => {
            this.toast.success('Offer declined');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to decline offer');
          },
        });
      });
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

  candidateName(item: JobOffer): string {
    const c = item.application?.candidate;
    return c ? `${c.firstName} ${c.lastName}` : '—';
  }

  jobTitle(item: JobOffer): string {
    return item.application?.jobOpening?.title ?? '—';
  }

  formatMoney(item: JobOffer): string {
    return this.recruitment.formatMoney(item.salary, item.currency);
  }

  statusClass(status: OfferStatus): string {
    return `recruitment-status-pill recruitment-status-pill--${status.toLowerCase()}`;
  }

  statusLabel(status: OfferStatus): string {
    return this.recruitment.statusLabel(status);
  }

  canEdit(item: JobOffer): boolean {
    return this.canCreate && item.status === 'DRAFT';
  }

  canSend(item: JobOffer): boolean {
    return this.canUpdate && item.status === 'DRAFT';
  }

  canRespond(item: JobOffer): boolean {
    return this.canApprove && item.status === 'SENT';
  }
}
