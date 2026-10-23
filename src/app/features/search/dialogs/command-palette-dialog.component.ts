import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import {
  GlobalSearchHit,
  GlobalService,
  RecentSearchItem,
  SearchBookmark,
} from '../../../core/services/global.service';

export interface CommandPaletteData {
  initialQuery?: string;
}

const TYPE_LABELS: Record<string, string> = {
  employees: 'Employees',
  departments: 'Departments',
  branches: 'Branches',
  candidates: 'Candidates',
  jobs: 'Jobs',
  files: 'Files',
  users: 'Users',
};

@Component({
  selector: 'app-command-palette-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './command-palette-dialog.component.html',
  styleUrl: './command-palette-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteDialogComponent implements OnInit {
  private readonly global = inject(GlobalService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef = inject(MatDialogRef<CommandPaletteDialogComponent>);
  readonly data = inject<CommandPaletteData>(MAT_DIALOG_DATA, { optional: true });

  readonly query = new FormControl(this.data?.initialQuery ?? '', { nonNullable: true });
  readonly hits = signal<GlobalSearchHit[]>([]);
  readonly recent = signal<RecentSearchItem[]>([]);
  readonly bookmarks = signal<SearchBookmark[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.global
      .listRecent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => this.recent.set(res.items.slice(0, 5)),
      error: () => undefined,
    });
    this.global
      .listBookmarks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => this.bookmarks.set(res.items.slice(0, 5)),
      error: () => undefined,
    });

    this.query.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          const trimmed = q.trim();
          if (trimmed.length < 2) {
            this.hits.set([]);
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.global.search({ q: trimmed, pageSize: 8, saveRecent: false }).pipe(
            catchError(() => of({ items: [] as GlobalSearchHit[] })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.hits.set(res.items);
          this.loading.set(false);
        }
      });

    if ((this.data?.initialQuery ?? '').trim().length >= 2) {
      this.query.setValue(this.data!.initialQuery!.trim());
    }
  }

  openFullSearch(): void {
    const q = this.query.value.trim();
    this.dialogRef.close();
    void this.router.navigate(['/search'], { queryParams: q ? { q } : {} });
  }

  go(route: string, query?: string | null): void {
    this.dialogRef.close();
    if (query) {
      void this.router.navigate(['/search'], { queryParams: { q: query } });
      return;
    }
    void this.router.navigateByUrl(route);
  }

  openHit(hit: GlobalSearchHit): void {
    this.dialogRef.close();
    void this.router.navigateByUrl(hit.route);
  }

  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }
}
