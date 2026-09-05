# Plan de Implementación: Web Dashboard de TitanBot

- **Fecha:** 2026-09-04
- **Rama objetivo:** `custom`
- **Especificación asociada:** `docs/superpowers/specs/2026-09-04-web-dashboard-design.md`
- **Estado:** Planificado (Listo para ejecución futura)

---

## Resumen Ejecutivo

Este plan detalla la construcción paso a paso del Web Dashboard integrado de TitanBot (Monolito: React 18 + Vite + Tailwind servido estáticamente por Express en el puerto 3000).

El desarrollo está organizado en 5 fases secuenciales e independientes para garantizar control de calidad, cobertura de pruebas y cero impacto negativo en las funciones existentes del bot de Discord.

---

## Fase 1: Infraestructura Backend, Dependencias y Utilidades de Seguridad

### 1.1 Dependencias Backend
- Instalar en el `package.json` raíz:
  - `cookie-parser`: Parseo y validación de cookies de sesión.
  - `jsonwebtoken`: Firma y verificación criptográfica de tokens JWT.
  - `express-rate-limit`: Prevención de abusos en endpoints de autenticación y API.

### 1.2 Variables de Entorno y Configuración
- Actualizar `.env.example` y `src/config/bot.js` para documentar y validar:
  - `CLIENT_SECRET`: Secreto de aplicación de Discord Developer Portal.
  - `SESSION_SECRET`: Clave simétrica de 256 bits para firmar JWT.
  - `DASHBOARD_URL`: URL base del dashboard (por defecto `http://localhost:3000` o URL pública en VPS).

### 1.3 Utilidades Criptográficas y de OAuth2
- Crear `src/api/utils/tokenHelper.js`:
  - `createSessionToken(payload)`: Genera JWT firmado con expiración de 7 días.
  - `verifySessionToken(token)`: Valida firma y expiración del JWT.
- Crear `src/api/utils/oauthHelper.js`:
  - `generateOAuthState()`: Genera token criptográfico efímero de 32 bytes.
  - `exchangeCodeForTokens(code, redirectUri)`: Llamada a Discord OAuth2 `/oauth2/token`.
  - `fetchDiscordUser(accessToken)`: Llamada a Discord `/users/@me`.
  - `fetchDiscordUserGuilds(accessToken)`: Llamada a Discord `/users/@me/guilds`.

### 1.4 Middlewares de Seguridad
- Crear `src/api/middlewares/rateLimiter.js`: Limitador de tasa por IP para `/api/auth/*`.
- Crear `src/api/middlewares/verifyAuth.js`: Extrae y valida la cookie `titanbot_session`.
- Crear `src/api/middlewares/checkGuildPermissions.js`:
  - Verifica si `userId` es bot owner (`OWNER_IDS`) o tiene `ADMINISTRATOR` (0x8) o `MANAGE_GUILD` (0x20).
  - Rechaza con `403 Forbidden` si no tiene permisos suficientes.

---

## Fase 2: Controladores y Rutas API Express

### 2.1 Módulo de Autenticación (`src/api/routes/authRoutes.js`)
- `GET /api/auth/login`: Inicia el handshake OAuth2 con cookie segura de state CSRF.
- `GET /api/auth/callback`: Valida state, intercambia código por token, genera sesión JWT en cookie `titanbot_session` y redirige a `/servers`.
- `GET /api/auth/me`: Retorna los datos del usuario logueado.
- `POST /api/auth/logout`: Elimina la cookie de sesión y responde `{ success: true }`.

### 2.2 Módulo de Servidores y Configuración (`src/api/routes/guildRoutes.js`)
- `GET /api/guilds`: Retorna servidores del usuario con bandera `botInGuild` y URL de invitación si corresponde.
- `GET /api/guilds/:guildId`: Metadatos del servidor (nombre, icono, conteo de miembros).
- `GET /api/guilds/:guildId/channels`: Lista de canales de texto para desplegables.
- `GET /api/guilds/:guildId/roles`: Lista de roles del servidor para desplegables.
- `GET /api/guilds/:guildId/config`: Lee configuración desde PostgreSQL vía `getGuildConfig`.
- `PATCH /api/guilds/:guildId/config`: Valida esquema y actualiza configuración vía `patchGuildConfig`.

### 2.3 Módulo de Comandos (`src/api/routes/commandRoutes.js`)
- `GET /api/commands`: Catálogo completo de comandos agrupados por categorías con metadatos i18n.
- `PATCH /api/guilds/:guildId/commands`: Actualiza `disabledCategories` y `disabledCommands`.

### 2.4 Montaje y Pruebas Unitarias Backend
- Montar router en `src/api/routes/index.js` y conectar en `src/app.js`.
- Crear tests unitarios Jest en `tests/api/`:
  - Test de validación de JWT y cookies.
  - Test de middleware de permisos.
  - Test de endpoints de lectura y actualización de configuración.

---

## Fase 3: Scaffolding y Configuración del Frontend (React + Vite + Tailwind)

### 3.1 Estructura del Proyecto Frontend
- Inicializar `dashboard/`:
  - `package.json` con dependencias: `react`, `react-dom`, `react-router-dom`, `lucide-react`, `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
  - DevDependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`.
  - `vite.config.js`: Configurado con proxy en dev (`/api -> http://localhost:3000`).
  - `tailwind.config.js`: Paleta de colores temáticos oscuros (Discord dark / slate).

### 3.2 Sistema de Internacionalización Frontend
- Configurar `dashboard/src/i18n.js`.
- Crear diccionarios completos:
  - `dashboard/src/locales/en-US.json`
  - `dashboard/src/locales/es-419.json`
  - `dashboard/src/locales/de.json`

### 3.3 Contextos Globales de Estado
- `AuthContext`: Estado del usuario logueado (`user`, `loading`, `login()`, `logout()`).
- `GuildContext`: Servidor actualmente seleccionado, canales en vivo, roles en vivo, configuración cargada, estado de cambios sin guardar.
- `LanguageContext`: Selector y persistencia del idioma de la UI (`es-419`, `en-US`, `de`).

---

## Fase 4: Desarrollo de Componentes y Vistas del Dashboard

### 4.1 Componentes UI Reutilizables
- Botones con estados de carga y variantes (primary, secondary, danger).
- Switch / Toggle animado accesible.
- Selectores desplegables personalizados (soporte para icono `#` en canales y bolita de color en roles).
- `UnsavedChangesBar`: Barra flotante animada con botones "Guardar Cambios" y "Descartar".
- `ToastNotification`: Feedback visual instantáneo para éxito y errores.

### 4.2 Vistas Principales
- `LandingPage`:
  - Hero section con arte de TitanBot y llamada a la acción "Iniciar sesión con Discord".
  - Métricas públicas en vivo (servidores, comandos, estado online).
- `GuildSelector`:
  - Cuadrícula de servidores del usuario.
  - Distinción clara: servidores donde el bot está activo (botón "Administrar") vs donde falta invitarlo (botón "Invitar Bot").
- `DashboardLayout`:
  - Sidebar fija con icono y nombre del servidor, navegación entre módulos y botón para cambiar de servidor.
  - Topbar con selector de idioma (`🇪🇸 ES`, `🇺🇸 EN`, `🇩🇪 DE`), avatar del usuario y menú de logout.

### 4.3 Pestañas de Configuración
- `GeneralTab`:
  - Selector de idioma del bot (`es-419`, `en-US`, `de`).
  - Input de prefijo (validación de 1-5 caracteres).
  - Selectores de rol de Administrador y rol de Moderador.
- `WelcomeTab`:
  - Selector de canal de bienvenida.
  - Editor de mensaje de bienvenida.
  - **Live Preview:** Tarjeta interactiva con estilo Discord que renderiza en tiempo real cómo verá el usuario el mensaje (reemplazando `{user}`, `{server}`).
  - Selector de Rol Automático (`autoRole`).
- `LoggingTab`:
  - Toggle maestro de logs.
  - Asignación de canales para auditoría y reportes.
- `CommandsTab`:
  - Lista de categorías de comandos (Moderación, Economía, Música, Diversión, etc.).
  - Switch para deshabilitar categoría completa.
  - Acordeón para ver comandos individuales y switches unitarios.
- `VerificationTab`:
  - Toggle maestro para activar el sistema de verificación del servidor.

---

## Fase 5: Integración Monolítica, Docker y Verificación Final

### 5.1 Integración en Express
- En `src/app.js`:
  - Middleware de archivos estáticos `express.static('dashboard/dist')`.
  - Fallback SPA para que cualquier ruta de navegación de React (`/servers`, `/manage/...`) cargue `dashboard/dist/index.html`.

### 5.2 Scripts y Dockerfile
- En `package.json` raíz:
  - `"build:dashboard": "cd dashboard && npm run build"`
  - `"dev:dashboard": "cd dashboard && npm run dev"`
- En `Dockerfile`:
  - Instalar dependencias del bot y del dashboard.
  - Ejecutar `npm run build:dashboard`.
  - Asegurar que `dashboard/dist` esté empaquetado en la imagen final.

### 5.3 Checklist de Verificación y Testing
- [ ] Pruebas unitarias de la API ejecutadas con éxito (`npm test`).
- [ ] `npm run build` en `dashboard/` sin errores de transpilación o empaquetado.
- [ ] Compilación del contenedor Docker local con `docker compose build`.
- [ ] Verificación de endpoints `/ready` y `/health` del bot funcionando al 100%.
- [ ] Comprobación del flujo OAuth2 en vivo: Login -> Selección de Servidor -> Edición de configuración -> Guardado en PostgreSQL -> Verificación en Discord.
