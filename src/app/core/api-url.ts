import { environment } from '../../environments/environment';

/** Absolute-to-the-app URL of a backend endpoint, e.g. apiUrl('/orders'). */
export function apiUrl(path: string): string {
  return `${environment.apiBaseUrl}${path}`;
}

/** Whether a request targets the EasyMK backend (and so needs auth handling). */
export function isApiUrl(url: string): boolean {
  return url.startsWith(`${environment.apiBaseUrl}/`);
}
