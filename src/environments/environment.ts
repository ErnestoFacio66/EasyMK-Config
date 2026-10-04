/** Production defaults. The API is expected behind the same origin at /api. */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  /** Serve every /api call from the in-memory mock backend instead of the real one. */
  useMocks: false,
  /**
   * Base URL of EasyMK-WebApp. Invitation links point there, because that is
   * where invited users accept and then work. Empty = same origin as this app.
   */
  webAppUrl: '',
};
