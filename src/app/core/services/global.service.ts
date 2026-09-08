import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export type GlobalSearchType =
  | 'employees'
  | 'departments'
  | 'branches'
  | 'candidates'
  | 'jobs'
  | 'files'
  | 'users';

export type GlobalSortBy = 'relevance' | 'title' | 'updatedAt' | 'type';
export type GlobalSortDir = 'asc' | 'desc';

export interface GlobalSearchHit {
  id: string;
  type: GlobalSearchType | string;
  title: string;
  subtitle: string;
  route: string;
  icon: string;
  status?: string | null;
  updatedAt: string;
  meta?: Record<string, unknown>;
}

export interface GlobalSearchParams {
  q: string;
  types?: string;
  page?: number;
  pageSize?: number;
  sortBy?: GlobalSortBy;
  sortDir?: GlobalSortDir;
  departmentId?: string;
  status?: string;
  category?: string;
}

export interface GlobalSearchResult {
  query: string;
  types: string[];
  availableTypes: string[];
  countsByType: Record<string, number>;
  items: GlobalSearchHit[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort: { sortBy: GlobalSortBy | string; sortDir: GlobalSortDir | string };
  filters: {
    departmentId?: string | null;
    status?: string | null;
    category?: string | null;
  };
}

export interface RecentSearchItem {
  id: string;
  query: string;
  types: string[];
  filters?: unknown;
  resultCount: number;
  createdAt: string;
}

export interface SearchBookmark {
  id: string;
  title: string;
  route: string;
  entityType?: string | null;
  entityId?: string | null;
  query?: string | null;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookmarkBody {
  title: string;
  route: string;
  entityType?: string | null;
  entityId?: string | null;
  query?: string | null;
  icon?: string | null;
}

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  macKeys: string[];
  action: string;
  scope: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalService {
  private readonly api = inject(ApiService);

  search(params: GlobalSearchParams): Observable<GlobalSearchResult> {
    return this.api
      .get<GlobalSearchResult>(
        '/global/search',
        params as unknown as Record<string, string | number | boolean>,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  listRecent(): Observable<{ items: RecentSearchItem[] }> {
    return this.api
      .get<{ items: RecentSearchItem[] }>('/global/recent-searches')
      .pipe(map((res) => this.unwrap(res)));
  }

  clearRecent(): Observable<{ cleared: boolean }> {
    return this.api
      .delete<{ cleared: boolean }>('/global/recent-searches')
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteRecent(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/global/recent-searches/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listBookmarks(): Observable<{ items: SearchBookmark[] }> {
    return this.api
      .get<{ items: SearchBookmark[] }>('/global/bookmarks')
      .pipe(map((res) => this.unwrap(res)));
  }

  createBookmark(body: CreateBookmarkBody): Observable<SearchBookmark> {
    return this.api
      .post<SearchBookmark>('/global/bookmarks', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteBookmark(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/global/bookmarks/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  getShortcuts(): Observable<{ items: KeyboardShortcut[] }> {
    return this.api
      .get<{ items: KeyboardShortcut[] }>('/global/shortcuts')
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
