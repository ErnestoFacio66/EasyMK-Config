import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { isApiUrl } from './api-url';

/** Endpoints that authenticate by themselves and must never trigger a refresh. */
const AUTH_ENDPOINTS = ['/auth/', '/platform/auth/', '/invitations/'];

function withToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Adds the access token to backend calls and, when the backend answers 401,
 * refreshes it once and retries. If that is not possible the session is
 * cleared and the user is sent back to the matching login screen.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiUrl(request.url) || AUTH_ENDPOINTS.some((path) => request.url.includes(path))) {
    return next(request);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const session = auth.session();
  const outgoing = session ? withToken(request, session.accessToken) : request;

  const expire = () => {
    const loginUrl = auth.isPlatform() ? '/platform/login' : '/login';
    auth.clearSession();
    router.navigateByUrl(loginUrl);
  };

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !session) {
        return throwError(() => error);
      }
      if (!auth.canRefresh()) {
        expire();
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          expire();
          return throwError(() => refreshError);
        }),
        switchMap((token) => next(withToken(request, token))),
      );
    }),
  );
};
