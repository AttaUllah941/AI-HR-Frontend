import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { FilesService, FilesSummary } from '../../../../core/services/files.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { UploadFileDialogComponent } from '../../dialogs/upload-file-dialog.component';

@Component({
  selector: 'app-files-overview-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './files-overview-page.component.html',
  styleUrl: './files-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesOverviewPageComponent implements OnInit {
  private readonly files = inject(FilesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly summary = signal<FilesSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly canCreate = this.auth.hasPermission('files:create');

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.files.getSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load files summary.');
        this.loading.set(false);
      },
    });
  }

  openUpload(): void {
    if (!this.canCreate) return;
    this.dialog
      .open(UploadFileDialogComponent, { width: '34rem', data: { defaultCategory: 'GENERAL' } })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.reload();
      });
  }

  formatBytes(n: number): string {
    return this.files.formatBytes(n);
  }
}
