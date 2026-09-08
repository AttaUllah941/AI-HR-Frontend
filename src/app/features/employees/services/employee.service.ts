import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { ApiResponse } from '../../../core/models/api.models';
import { Employee, EmployeeListParams, EmployeeListResponse } from '../models/employee.models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly api = inject(ApiService);

  list(params?: EmployeeListParams): Observable<EmployeeListResponse> {
    return this.api
      .get<EmployeeListResponse>(
        '/employees',
        params as Record<string, string | number | boolean | undefined> | undefined,
      )
      .pipe(map((res) => this.unwrap(res)));
  }

  getById(id: string): Observable<Employee> {
    return this.api.get<Employee>(`/employees/${id}`).pipe(map((res) => this.unwrap(res)));
  }

  create(payload: Partial<Employee>): Observable<Employee> {
    return this.api.post<Employee>('/employees', payload).pipe(map((res) => this.unwrap(res)));
  }

  update(id: string, payload: Partial<Employee>): Observable<Employee> {
    return this.api.patch<Employee>(`/employees/${id}`, payload).pipe(map((res) => this.unwrap(res)));
  }

  remove(id: string): Observable<{ deleted: boolean }> {
    return this.api
      .delete<{ deleted: boolean }>(`/employees/${id}`)
      .pipe(map((res) => this.unwrap(res)));
  }

  exportCsv(params?: EmployeeListParams): Observable<string> {
    return this.api.getText(
      '/employees/export',
      params as Record<string, string | number | boolean | undefined> | undefined,
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
      throw new Error(res.message || 'Request failed');
    }
    return res.data;
  }
}
