/**
 * `ng serve` defaults (this app runs on port 4300). /api is proxied to the
 * backend on localhost:8080 (see proxy.conf.json). Set useMocks to false once
 * the backend is running.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  useMocks: true,
  webAppUrl: 'http://localhost:4200',
};
