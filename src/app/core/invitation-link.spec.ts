import { environment } from '../../environments/environment';
import { invitationLink } from './invitation-link';

describe('invitationLink', () => {
  const original = environment.webAppUrl;

  afterEach(() => (environment.webAppUrl = original));

  it('should point to EasyMK-WebApp, escaping the token', () => {
    environment.webAppUrl = 'https://app.easymk.mx/';

    expect(invitationLink('a/b c')).toBe('https://app.easymk.mx/invitations/a%2Fb%20c');
  });

  it('should fall back to this origin when no WebApp URL is configured', () => {
    environment.webAppUrl = '';

    expect(invitationLink('t1')).toBe(`${window.location.origin}/invitations/t1`);
  });
});
