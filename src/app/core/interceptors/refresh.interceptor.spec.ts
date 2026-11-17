import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshInterceptor } from './refresh.interceptor';
import { AuthService } from '../services/auth.service';
import type { AuthSessionData } from '../models/api.models';

describe('refreshInterceptor', () => {
  let refresh$ = new Subject<AuthSessionData>();
  const authStub = {
    getRefreshToken: vi.fn(() => 'refresh-token'),
    refresh: vi.fn(() => refresh$.asObservable()),
    clearSession: vi.fn(),
  };
  let http: HttpClient;
  let controller: HttpTestingController;

  const session = { accessToken: 'new-access' } as AuthSessionData;

  beforeEach(() => {
    refresh$ = new Subject<AuthSessionData>();
    authStub.getRefreshToken.mockClear();
    authStub.refresh.mockClear();
    authStub.clearSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([refreshInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authStub },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  it('retries the request with the new token after a successful refresh', () => {
    let result: unknown;
    http.get('/api/employees').subscribe((value) => (result = value));

    controller.expectOne('/api/employees').flush({}, { status: 401, statusText: 'Unauthorized' });
    refresh$.next(session);
    refresh$.complete();

    const retry = controller.expectOne('/api/employees');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(authStub.clearSession).not.toHaveBeenCalled();
  });

  it('does not clear the session when the retried request fails with 500', () => {
    let error: HttpErrorResponse | undefined;
    http.get('/api/employees').subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    controller.expectOne('/api/employees').flush({}, { status: 401, statusText: 'Unauthorized' });
    refresh$.next(session);
    refresh$.complete();
    controller.expectOne('/api/employees').flush({}, { status: 500, statusText: 'Server Error' });

    expect(error?.status).toBe(500);
    expect(authStub.clearSession).not.toHaveBeenCalled();
  });

  it('clears the session when the refresh call is rejected with 401', () => {
    let error: HttpErrorResponse | undefined;
    http.get('/api/employees').subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    controller.expectOne('/api/employees').flush({}, { status: 401, statusText: 'Unauthorized' });
    refresh$.error(new HttpErrorResponse({ status: 401 }));

    expect(error?.status).toBe(401);
    expect(authStub.clearSession).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh for public auth endpoints', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    controller.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(authStub.refresh).not.toHaveBeenCalled();
  });
});
