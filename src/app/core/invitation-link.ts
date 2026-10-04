import { environment } from '../../environments/environment';

/**
 * Link an invitee opens to accept. It points to EasyMK-WebApp, where users
 * set their password and then work; the API returns the token only once.
 */
export function invitationLink(token: string): string {
  const base = (environment.webAppUrl || window.location.origin).replace(/\/$/, '');
  return `${base}/invitations/${encodeURIComponent(token)}`;
}
