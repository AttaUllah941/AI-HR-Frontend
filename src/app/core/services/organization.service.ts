import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api.models';

export interface OrgCompany {
  id: string;
  name: string;
  legalName: string | null;
}

export interface BranchAllowedIp {
  id: string;
  cidr: string;
  label: string | null;
}

export interface BranchInput {
  name?: string;
  code?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  isHeadOffice?: boolean;
  isActive?: boolean;
  allowedIps?: string[];
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
  allowedIps?: BranchAllowedIp[];
}

export interface Department {
  id: string;
  companyId: string;
  branchId: string | null;
  parentId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  teamCount?: number;
  branch?: { id: string; name: string; code: string } | null;
  parent?: { id: string; name: string; code: string } | null;
}

export interface Team {
  id: string;
  companyId: string;
  departmentId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  department?: { id: string; name: string; code: string };
}

export interface Designation {
  id: string;
  companyId: string;
  name: string;
  code: string;
  level: number;
  description: string | null;
  isActive: boolean;
}

export interface OrgChartNode {
  id: string;
  name: string;
  code: string;
  branch: { id: string; name: string; code: string } | null;
  teams: Array<{ id: string; name: string; code: string }>;
  children: OrgChartNode[];
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly api = inject(ApiService);

  getOverview(): Observable<{
    company: OrgCompany;
    counts: { branches: number; departments: number; teams: number; designations: number };
  }> {
    return this.api
      .get<{
        company: OrgCompany;
        counts: { branches: number; departments: number; teams: number; designations: number };
      }>('/organization/overview')
      .pipe(map((res) => this.unwrap(res)));
  }

  getChart(): Observable<{ company: OrgCompany | null; tree: OrgChartNode[] }> {
    return this.api
      .get<{ company: OrgCompany | null; tree: OrgChartNode[] }>('/organization/chart')
      .pipe(map((res) => this.unwrap(res)));
  }

  listBranches(): Observable<Branch[]> {
    return this.api
      .get<{ items: Branch[] }>('/organization/branches')
      .pipe(map((res) => this.unwrap(res).items));
  }

  createBranch(body: BranchInput): Observable<Branch> {
    return this.api.post<Branch>('/organization/branches', body).pipe(map((res) => this.unwrap(res)));
  }

  updateBranch(id: string, body: BranchInput): Observable<Branch> {
    return this.api
      .patch<Branch>(`/organization/branches/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteBranch(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/organization/branches/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listDepartments(): Observable<Department[]> {
    return this.api
      .get<{ items: Department[] }>('/organization/departments')
      .pipe(map((res) => this.unwrap(res).items));
  }

  createDepartment(body: Record<string, unknown>): Observable<Department> {
    return this.api
      .post<Department>('/organization/departments', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateDepartment(id: string, body: Record<string, unknown>): Observable<Department> {
    return this.api
      .patch<Department>(`/organization/departments/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteDepartment(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/organization/departments/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listTeams(): Observable<Team[]> {
    return this.api
      .get<{ items: Team[] }>('/organization/teams')
      .pipe(map((res) => this.unwrap(res).items));
  }

  createTeam(body: Record<string, unknown>): Observable<Team> {
    return this.api.post<Team>('/organization/teams', body).pipe(map((res) => this.unwrap(res)));
  }

  updateTeam(id: string, body: Record<string, unknown>): Observable<Team> {
    return this.api
      .patch<Team>(`/organization/teams/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteTeam(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/organization/teams/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  listDesignations(): Observable<Designation[]> {
    return this.api
      .get<{ items: Designation[] }>('/organization/designations')
      .pipe(map((res) => this.unwrap(res).items));
  }

  createDesignation(body: Record<string, unknown>): Observable<Designation> {
    return this.api
      .post<Designation>('/organization/designations', body)
      .pipe(map((res) => this.unwrap(res)));
  }

  updateDesignation(id: string, body: Record<string, unknown>): Observable<Designation> {
    return this.api
      .patch<Designation>(`/organization/designations/${id}`, body)
      .pipe(map((res) => this.unwrap(res)));
  }

  deleteDesignation(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/organization/designations/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
