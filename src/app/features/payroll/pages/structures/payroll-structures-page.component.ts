import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PayrollService, SalaryStructure } from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationSectionHeaderComponent } from '../../../organization/components/organization-section-header/organization-section-header.component';
import { SalaryStructureFormDialogComponent } from '../../dialogs/salary-structure-form-dialog.component';

@Component({
  selector: 'app-payroll-structures-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationSectionHeaderComponent,
  ],
  templateUrl: './payroll-structures-page.component.html',
  styleUrl: './payroll-structures-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollStructuresPageComponent implements OnInit {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<SalaryStructure[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('payroll:create');
  readonly canUpdate = this.auth.hasPermission('payroll:update');
  readonly canDelete = this.auth.hasPermission('payroll:delete');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.payroll.listStructures({ page: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.items.set(Array.isArray(res) ? res : res.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load salary structures. Please try again.');
        this.loading.set(false);
      },
    });
  }

  openForm(structure: SalaryStructure | null = null): void {
    const open = (data: SalaryStructure | null) => {
      this.dialog
        .open(SalaryStructureFormDialogComponent, {
          data: { structure: data },
          width: '640px',
          autoFocus: 'first-tabbable',
          restoreFocus: true,
        })
        .afterClosed()
        .subscribe((saved) => {
          if (saved) {
            this.reload();
          }
        });
    };

    if (structure?.id && !(structure.components?.length)) {
      this.payroll.getStructure(structure.id).subscribe({
        next: (full) => open(full),
        error: () => open(structure),
      });
      return;
    }
    open(structure);
  }

  remove(item: SalaryStructure): void {
    const name = item.employee
      ? `${item.employee.firstName} ${item.employee.lastName}`
      : 'this structure';
    this.confirm
      .open({
        title: 'Delete salary structure',
        message: `Are you sure you want to delete the salary structure for ${name}?`,
        confirmLabel: 'Delete structure',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter((confirmed) => confirmed === true))
      .subscribe(() => {
        this.deletingId.set(item.id);
        this.payroll.deleteStructure(item.id).subscribe({
          next: () => {
            this.toast.success('Salary structure deleted');
            this.deletingId.set(null);
            this.reload();
          },
          error: (err: Error) => {
            this.deletingId.set(null);
            this.toast.error(err.message || 'Unable to delete salary structure');
          },
        });
      });
  }

  formatMoney(amount: number, currency: string): string {
    return this.payroll.formatMoney(amount, currency);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) {
      return value;
    }
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
