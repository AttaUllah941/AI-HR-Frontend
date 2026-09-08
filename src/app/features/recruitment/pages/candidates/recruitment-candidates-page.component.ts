import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Candidate, RecruitmentService } from '../../../../core/services/recruitment.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { CandidateFormDialogComponent } from '../../dialogs/candidate-form-dialog.component';
import { ResumeAttachDialogComponent } from '../../dialogs/resume-attach-dialog.component';
import { ScreeningFormDialogComponent } from '../../dialogs/screening-form-dialog.component';

@Component({
  selector: 'app-recruitment-candidates-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './recruitment-candidates-page.component.html',
  styleUrl: './recruitment-candidates-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruitmentCandidatesPageComponent implements OnInit {
  private readonly recruitment = inject(RecruitmentService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<Candidate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionId = signal<string | null>(null);
  readonly menuItem = signal<Candidate | null>(null);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly pageSize = 20;

  readonly canCreate = this.auth.hasPermission('recruitment:create');
  readonly canUpdate = this.auth.hasPermission('recruitment:update');
  readonly canDelete = this.auth.hasPermission('recruitment:delete');

  readonly searchControl = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
        this.reload();
      });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.recruitment
      .listCandidates({
        search: this.searchControl.value.trim() || undefined,
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
          this.error.set('Unable to load candidates. Please try again.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    this.dialog
      .open(CandidateFormDialogComponent, {
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

  openEdit(item: Candidate): void {
    this.dialog
      .open(CandidateFormDialogComponent, {
        data: { candidate: item },
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

  openResume(item: Candidate): void {
    this.dialog
      .open(ResumeAttachDialogComponent, {
        data: { candidate: item },
        width: '480px',
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

  openScreening(item: Candidate): void {
    this.dialog
      .open(ScreeningFormDialogComponent, {
        data: { candidate: item },
        width: '480px',
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

  setMenuItem(item: Candidate): void {
    this.menuItem.set(item);
  }

  remove(item: Candidate): void {
    this.confirm
      .open({
        title: 'Delete candidate',
        message: `Delete ${item.firstName} ${item.lastName}?`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.actionId.set(item.id);
        this.recruitment.deleteCandidate(item.id).subscribe({
          next: () => {
            this.toast.success('Candidate deleted');
            this.actionId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.actionId.set(null);
            this.toast.error(err.message || 'Unable to delete candidate');
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

  fullName(item: Candidate): string {
    return `${item.firstName} ${item.lastName}`;
  }
}
