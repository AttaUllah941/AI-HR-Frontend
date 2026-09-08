import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import {
  CompanyProfile,
  Department,
  Location,
  OrganizationListResponse,
  OrganizationOverview,
} from '../models/organization.models';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly api = inject(ApiService);

  getOverview(): Observable<OrganizationOverview> {
    return this.api
      .get<OrganizationOverview>('/organization/overview')
      .pipe(map((res) => this.unwrap(res)));
  }

  getCompany(): Observable<CompanyProfile> {
    return this.api.get<CompanyProfile>('/organization/company').pipe(map((res) => this.unwrap(res)));
  }

  updateCompany(payload: Partial<CompanyProfile>): Observable<CompanyProfile> {
    return this.api
      .patch<CompanyProfile>('/organization/company', payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  listDepartments(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<OrganizationListResponse<Department>> {
    return this.api
      .get<OrganizationListResponse<Department>>('/organization/departments', params)
      .pipe(map((res) => this.unwrap(res)));
  }

  createDepartment(payload: Partial<Department>): Observable<Department> {
    return this.api
      .post<Department>('/organization/departments', payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateDepartment(id: string, payload: Partial<Department>): Observable<Department> {
    return this.api
      .patch<Department>(`/organization/departments/${id}`, payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteDepartment(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/organization/departments/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listLocations(params?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<OrganizationListResponse<Location>> {
    return this.api
      .get<OrganizationListResponse<Location>>('/organization/locations', params)
      .pipe(map((res) => this.unwrap(res)));
  }

  createLocation(payload: Partial<Location>): Observable<Location> {
    return this.api
      .post<Location>('/organization/locations', payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateLocation(id: string, payload: Partial<Location>): Observable<Location> {
    return this.api
      .patch<Location>(`/organization/locations/${id}`, payload)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteLocation(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/organization/locations/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
