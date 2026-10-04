# EasyMK-Config

App de configuración de EasyMK (Angular 18, mismo estilo que `EasyMK-WebApp`). Consume la API de
`EasyMK-Backend` y cubre:

- **Configuración del seller** (usuarios con rol ADMIN): cuentas de Walmart (conectar, rotar
  credenciales, activar/desactivar) e invitación de usuarios con roles.
- **Consola de plataforma** (staff de EasyMK, `/platform/login`): alta de sellers con invitación de
  su primer administrador y alta de administradores de plataforma.

La operación diaria (Dashboard, Órdenes, Artículos) y la activación de invitaciones están en
`../EasyMK-WebApp`; los enlaces de invitación apuntan ahí (`webAppUrl` en `src/environments/`).

## Desarrollo

```
npm install
npx ng serve      # http://localhost:4300
npx ng test --watch=false
```

Todas las llamadas van a `/api/...`; `proxy.conf.json` las reenvía al backend en
`http://localhost:8080`.

### Datos de prueba (sin backend)

`src/environments/environment.development.ts` trae `useMocks: true`: un interceptor responde las
mismas rutas, formas y códigos de error que el backend, con datos en memoria.

| Acceso | Correo | Contraseña |
|---|---|---|
| Administrador del seller | `admin@easymk.mx` | `password123` |
| Usuario sin ADMIN (se le niega el acceso) | `ordenes@easymk.mx` | `password123` |
| Staff de plataforma (`/platform/login`) | `staff@easymk.mx` | `password123` |

Un Client Secret que contenga `invalid` simula que Walmart rechaza las credenciales.

### Contra el backend real

1. Levanta `EasyMK-Backend` en el puerto 8080 (requiere Java 21 y MySQL; ver su `.env.example`).
2. Cambia `useMocks` a `false` en `src/environments/environment.development.ts`.
3. `npx ng serve`.

## Estilo compartido

`src/theme.scss`, `src/styles.css` y `public/favicon.svg` son copias de los de `EasyMK-WebApp`; si
cambias el look and feel en una app, replica el cambio en la otra.
