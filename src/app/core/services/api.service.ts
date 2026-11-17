import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { SKIP_LOADING } from '../interceptors/skip-loading';

export interface ApiGetOptions {
  /** Keep this request out of the global loading indicator (background refreshes, polling). */
  skipLoading?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: ApiGetOptions,
  ): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, {
      params: this.toParams(params),
      context: options?.skipLoading ? new HttpContext().set(SKIP_LOADING, true) : undefined,
    });
  }

  /** Binary download (CSV/PDF exports). */
  getBlob(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${path}`, {
      params: this.toParams(params),
      responseType: 'blob',
    });
  }

  postBlob(path: string, body?: unknown): Observable<Blob> {
    return this.http.post(`${this.baseUrl}${path}`, body ?? {}, {
      responseType: 'blob',
    });
  }

  post<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body ?? {});
  }

  /** Multipart upload — do not set Content-Type (browser sets boundary). */
  postFormData<T>(path: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, formData);
  }

  put<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body ?? {});
  }

  patch<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${path}`, body ?? {});
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`);
  }

  private toParams(
    params?: Record<string, string | number | boolean | undefined>,
  ): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}
