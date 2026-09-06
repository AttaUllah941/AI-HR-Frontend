import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';
import { environment } from '../../../environments/environment';

export type FileCategory =
  | 'GENERAL'
  | 'EMPLOYEE_DOCUMENT'
  | 'RESUME'
  | 'AVATAR'
  | 'POLICY'
  | 'OTHER';

export const FILE_CATEGORIES: FileCategory[] = [
  'GENERAL',
  'EMPLOYEE_DOCUMENT',
  'RESUME',
  'AVATAR',
  'POLICY',
  'OTHER',
];

export interface FilesSummary {
  totalFiles: number;
  totalBytes: number;
  maxUploadBytes: number;
  countsByCategory: Record<string, number>;
  storage: {
    provider: string;
    bucket?: string | null;
    region?: string | null;
    publicBaseUrl?: string | null;
    runtimeProvider: string;
  };
}

export interface StoredFileItem {
  id: string;
  companyId: string;
  category: FileCategory | string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  checksumSha256?: string | null;
  title?: string | null;
  description?: string | null;
  employeeId?: string | null;
  candidateId?: string | null;
  previewable: boolean;
  downloadUrl: string;
  previewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface FilesListParams {
  search?: string;
  category?: FileCategory | string;
  employeeId?: string;
  candidateId?: string;
  page?: number;
  pageSize?: number;
}

export interface FilesListResult {
  items: StoredFileItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadFileMeta {
  category?: FileCategory | string;
  title?: string;
  description?: string;
  employeeId?: string;
  candidateId?: string;
}

export interface UpdateFileBody {
  title?: string | null;
  description?: string | null;
  category?: FileCategory | string;
  employeeId?: string | null;
  candidateId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly api = inject(ApiService);

  getSummary(): Observable<FilesSummary> {
    return this.api.get<FilesSummary>('/files/summary').pipe(map((res) => this.unwrap(res)));
  }

  list(params: FilesListParams = {}): Observable<FilesListResult> {
    return this.api
      .get<FilesListResult>('/files', params as Record<string, string | number | boolean>)
      .pipe(map((res) => this.unwrap(res)));
  }

  getById(id: string): Observable<StoredFileItem> {
    return this.api.get<StoredFileItem>(`/files/${id}`).pipe(map((res) => this.unwrap(res)));
  }

  upload(file: File, meta: UploadFileMeta = {}): Observable<StoredFileItem> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (meta.category) form.append('category', meta.category);
    if (meta.title) form.append('title', meta.title);
    if (meta.description) form.append('description', meta.description);
    if (meta.employeeId) form.append('employeeId', meta.employeeId);
    if (meta.candidateId) form.append('candidateId', meta.candidateId);
    return this.api
      .postFormData<StoredFileItem>('/files/upload', form)
      .pipe(map((res) => this.unwrap(res)));
  }

  update(id: string, body: UpdateFileBody): Observable<StoredFileItem> {
    return this.api
      .patch<StoredFileItem>(`/files/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  remove(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/files/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  downloadBlob(id: string): Observable<Blob> {
    return this.api.getBlob(`/files/${id}/download`);
  }

  previewBlob(id: string): Observable<Blob> {
    return this.api.getBlob(`/files/${id}/preview`);
  }

  absoluteUrl(pathOrUrl: string | null | undefined): string {
    if (!pathOrUrl) return '';
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    const apiRoot = environment.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
    return `${apiRoot}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  formatBytes(bytes: number | null | undefined): string {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
