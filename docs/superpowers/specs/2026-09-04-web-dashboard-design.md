# Especificación Técnica: Web Dashboard de TitanBot

- **Fecha:** 2026-09-04
- **Estado:** Propuesto (Aprobado por el usuario en brainstorming)
- **Alcance:** MVP Ampliado (Discord OAuth2, Selector de Servidores, Ajustes Generales i18n/prefijo/roles, Bienvenida/AutoRole, Logs, Gestor de Comandos por Categorías, Verificación).

---

## 1. Visión General y Objetivos

El objetivo de este proyecto es dotar a TitanBot de un **Panel de Control Web (Dashboard)** profesional, responsivo y seguro que permita a los administradores de servidores de Discord gestionar la configuración de sus comunidades sin necesidad de memorizar comandos de texto o slash commands.

### Objetivos Principales:
1. **Monolito Integrado:** Alojar el frontend y el backend dentro del mismo repositorio y proceso/contenedor Docker, sin requerir contenedores adicionales ni abrir nuevos puertos en el VPS (usando el puerto `3000` de Express ya existente).
2. **Autenticación Nativa de Discord:** Inicio de sesión mediante Discord OAuth2 con comprobación estricta de permisos de servidor (`ADMINISTRATOR` o `MANAGE_GUILD`).
3. **Soporte Multilingüe (i18n):** Tanto el dashboard web como las configuraciones del bot soportan de manera nativa los tres idiomas oficiales del proyecto: **Español (`es-419`)**, **Inglés (`en-US`)** y **Alemán (`de`)**.
4. **Seguridad Robusta:** Protección contra ataques CSRF mediante parámetro `state`, sesiones con tokens JWT firmados en cookies `HttpOnly`, y validación exhaustiva de esquemas de datos.

---

## 2. Arquitectura del Sistema

```text
                                  +---------------------------------------+
                                  |            Navegador Web              |
                                  |    (React 18 + Vite + Tailwind)       |
                                  +-------------------+-------------------+
                                                      |
                                   HTTP(S) / REST     |  Puerto 3000
                                                      v
+-----------------------------------------------------------------------------------------+
| Contenedor Docker TitanBot                                                              |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | Express Server (src/app.js)                                                       |  |
|  |                                                                                   |  |
|  |  [ Static Middleware ] -----> Sirve dashboard/dist/ (HTML, JS, CSS, Assets)       |  |
|  |  [ SPA Fallback ] ----------> Redirige rutas desconocidas a index.html            |  |
|  |  [ /api Router ] -----------> Capa API REST                                       |  |
|  |        |                                                                          |  |
|  |        +---> /api/auth   (OAuth2, login, callback, me, logout)                    |  |
|  |        +---> /api/guilds (servidores, canales, roles, configuraciones)             |  |
|  |        +---> /api/commands (catálogo de comandos y switches de activación)         |  |
|  +--------+------------------------------------------+-------------------------------+  |
|           |                                          |                                  |
|           v                                          v                                  |
|  +--------------------------+               +--------------------------+                |
|  | Cliente Discord.js       |               | Servicio de Configuración|                |
|  | (client en memoria)      |               | (src/services/config/...) |                |
|  +--------------------------+               +------------+-------------+                |
+----------------------------------------------------------|------------------------------+
                                                           |
                                                           v
                                              +--------------------------+
                                              | Base de Datos PostgreSQL |
                                              +--------------------------+
```

### 2.1 Estructura de Directorios

```text
TitanBot/
├── dashboard/                     # Proyecto Frontend (React + Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── api/                   # Clientes HTTP (fetch con credenciales)
│       ├── components/            # Componentes reutilizables
│       │   ├── common/            # Buttons, Switches, Inputs, Dropdowns, Toasts
│       │   ├── layout/            # Navbar, Sidebar, UnsavedChangesBar
│       │   └── preview/           # WelcomePreview (renderiza variables y markdown)
│       ├── contexts/              # AuthContext, GuildContext, LanguageContext
│       ├── locales/               # Diccionarios de internacionalización
│       │   ├── en-US.json
│       │   ├── es-419.json
│       │   └── de.json
│       ├── pages/
│       │   ├── LandingPage.jsx    # Presentación y login
│       │   ├── GuildSelector.jsx  # Selección de servidores
│       │   └── manage/            # Pestañas de administración
│       │       ├── GeneralTab.jsx
│       │       ├── WelcomeTab.jsx
│       │       ├── LoggingTab.jsx
│       │       ├── CommandsTab.jsx
│       │       └── VerificationTab.jsx
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── src/
│   ├── api/                       # Capa API REST en backend
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── guildController.js
│   │   │   └── commandController.js
│   │   ├── middlewares/
│   │   │   ├── verifyAuth.js
│   │   │   ├── checkGuildPermissions.js
│   │   │   └── rateLimiter.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── guildRoutes.js
│   │   │   ├── commandRoutes.js
│   │   │   └── index.js
│   │   └── utils/
│   │       ├── oauthHelper.js
│   │       └── tokenHelper.js
│   ├── app.js                     # Integración de /api y archivos estáticos
│   └── services/config/guildConfig.js
```

---

## 3. Especificación del Backend y API REST

### 3.1 Variables de Entorno Requeridas (.env)

```env
# Discord OAuth2
CLIENT_ID=tu_discord_client_id
CLIENT_SECRET=tu_discord_client_secret
DASHBOARD_URL=http://localhost:3000
# o URL pública del VPS: https://tudominio.com

# Seguridad de Sesión
SESSION_SECRET=un_string_muy_seguro_y_aleatorio_de_al_menos_32_caracteres
```

### 3.2 Dependencias del Backend
- `cookie-parser`: Parseo de cookies firmadas / HttpOnly en peticiones Express.
- `jsonwebtoken`: Emisión y verificación de tokens JWT de sesión.
- `express-rate-limit`: Prevención de abusos y ataques por fuerza bruta en endpoints críticos.

### 3.3 Endpoints de la API

#### Autenticación (`/api/auth`)
| Método | Ruta | Descripción | Seguridad |
|---|---|---|---|
| `GET` | `/api/auth/login` | Inicia el flujo OAuth2. Genera un `state` CSRF y redirige a Discord. | Público / Rate Limited |
| `GET` | `/api/auth/callback` | Recibe `code` y `state` de Discord, valida el state, obtiene tokens, crea JWT en cookie `titanbot_session` y redirige a `/servers`. | Público / Rate Limited |
| `GET` | `/api/auth/me` | Devuelve datos del usuario autenticado (`id`, `username`, `avatar`, `discriminator`). | Requiere Sesión (`verifyAuth`) |
| `POST` | `/api/auth/logout` | Borra la cookie de sesión `titanbot_session`. | Requiere Sesión (`verifyAuth`) |

#### Servidores y Recursos en Vivo (`/api/guilds`)
| Método | Ruta | Descripción | Seguridad |
|---|---|---|---|
| `GET` | `/api/guilds` | Retorna lista de servidores donde el usuario es Admin/ManageGuild. Incluye `botInGuild: boolean` y `inviteUrl` si el bot no está. | Requiere Sesión |
| `GET` | `/api/guilds/:guildId` | Metadatos en vivo del servidor (nombre, icono, conteo de miembros). | Requiere Permisos en Guild |
| `GET` | `/api/guilds/:guildId/channels` | Lista de canales de texto (`id`, `name`, `type`) para selectores. | Requiere Permisos en Guild |
| `GET` | `/api/guilds/:guildId/roles` | Lista de roles del servidor (`id`, `name`, `color`, `position`). | Requiere Permisos en Guild |
| `GET` | `/api/guilds/:guildId/config` | Obtiene la configuración actual del servidor desde PostgreSQL. | Requiere Permisos en Guild |
| `PATCH` | `/api/guilds/:guildId/config` | Actualiza campos de configuración en PostgreSQL mediante `patchGuildConfig`. | Requiere Permisos en Guild |

#### Gestor de Comandos (`/api/commands`)
| Método | Ruta | Descripción | Seguridad |
|---|---|---|---|
| `GET` | `/api/commands` | Retorna el catálogo completo de comandos clasificados por categorías con nombre y descripción. | Público / Autenticado |
| `PATCH` | `/api/guilds/:guildId/commands` | Habilita o deshabilita categorías o comandos individuales (`disabledCategories`, `disabledCommands`). | Requiere Permisos en Guild |

---

## 4. Especificación del Frontend (SPA)

### 4.1 Dependencias y Herramientas
- **Framework & Build:** React 18, Vite 5.
- **Estilos:** Tailwind CSS con soporte para tema oscuro nativo (tonos `slate-900`, `slate-800`, `indigo-600` característicos de Discord).
- **Iconografía:** `lucide-react`.
- **Enrutamiento:** `react-router-dom` (v6).
- **Internacionalización:** `i18next`, `react-i18next`, `i18next-browser-languagedetector`.

### 4.2 Módulos y Pestañas de Configuración

1. **Ajustes Generales (`/general`):**
   - Idioma del Bot: Desplegable con opciones `es-419` (Español), `en-US` (English), `de` (Deutsch).
   - Prefijo de Comandos: Input de texto (1-5 caracteres, por defecto `!`).
   - Rol de Administrador: Selector desplegable de roles del servidor con indicador de color de rol.
   - Rol de Moderador: Selector desplegable de roles del servidor con indicador de color de rol.

2. **Bienvenida y AutoRole (`/welcome`):**
   - Canal de Bienvenida: Selector desplegable con canales de texto `#canal`.
   - Mensaje de Bienvenida: Textarea con variables disponibles explicadas (`{user}`, `{server}`, `{memberCount}`).
   - **Previsualizador en tiempo real:** Renderiza una tarjeta simulando un mensaje de Discord con el avatar del usuario y el texto formateado.
   - Rol Automático (`autoRole`): Selector de rol a otorgar automáticamente al unirse nuevos miembros.

3. **Logs y Auditoría (`/logging`):**
   - Toggle maestro: Activar / Desactivar Logging.
   - Canal de Auditoría (`channels.audit`): Selector de canal.
   - Canal de Reportes (`channels.reports`): Selector de canal.

4. **Gestor de Comandos (`/commands`):**
   - Tarjetas por cada categoría (Core, Moderation, Fun, Economy, Music, Giveaways, etc.).
   - Switch general por categoría para desactivar todos sus comandos a la vez.
   - Acordeón desplegable con la lista de comandos individuales dentro de la categoría y switches individuales.

5. **Verificación (`/verification`):**
   - Toggle maestro: Activar / Desactivar Sistema de Verificación.

### 4.3 Experiencia de Usuario (UX)
- **Barra Flotante de Cambios:** Cuando el usuario modifica cualquier ajuste, aparece en la parte inferior una barra animada con los botones *"Guardar Cambios"* y *"Descartar"*.
- **Toasts Informativos:** Alerta flotante animada que confirma *"Configuración guardada correctamente"* o notifica posibles errores.
- **Selector de Idioma de la Web:** Botón en la cabecera superior con banderas/códigos para alternar de forma inmediata la interfaz entre Español, Inglés y Alemán.

---

## 5. Seguridad y Control de Acceso

1. **Protección CSRF:** En `/api/auth/login`, se genera una cadena aleatoria criptográfica con `crypto.randomBytes(32).toString('hex')` y se almacena en una cookie HttpOnly efímera (`oauth_state`, `maxAge: 10 minutos`). El callback valida estrictamente que el parámetro recibido en la query coincida con dicha cookie.
2. **Cookies de Sesión:**
   - Nombre: `titanbot_session`.
   - Contenido: JWT firmado con `SESSION_SECRET` con expiración de 7 días.
   - Flags: `HttpOnly: true`, `SameSite: 'Lax'`, `Path: '/'`, `Secure: (process.env.NODE_ENV === 'production')`.
3. **Verificación de Permisos:** El middleware `checkGuildPermissions` verifica en cada petición de administración si:
   - El usuario es dueño del bot (`OWNER_IDS.includes(userId)`).
   - O bien, el usuario posee el flag de permisos `ADMINISTRATOR` (`8n`) o `MANAGE_GUILD` (`32n`) en dicho servidor. Si no cumple los requisitos, responde con `403 Forbidden`.
4. **Validación de Datos:** Antes de ejecutar `patchGuildConfig`, se valida estrictamente el cuerpo de la solicitud (tipos de datos, longitudes y valores permitidos).

---

## 6. Construcción y Despliegue (Docker)

El `Dockerfile` existente de TitanBot se actualizará para incluir la compilación del dashboard durante el build:

```dockerfile
# Instalación de dependencias del bot y del dashboard
COPY package*.json ./
RUN npm ci --omit=dev

COPY dashboard/package*.json ./dashboard/
RUN cd dashboard && npm ci

# Copia de código fuente
COPY . .

# Compilación de la SPA de React con Vite
RUN cd dashboard && npm run build

# Exposición del puerto único
EXPOSE 3000

CMD ["npm", "start"]
```

En `src/app.js`:
```javascript
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import apiRouter from './api/routes/index.js';

// Middlewares
app.use(cookieParser());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Servir frontend compilado
const distPath = path.resolve('dashboard/dist');
app.use(express.static(distPath));

// Fallback SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});
```

---

## 7. Plan de Verificación y Testing

1. **Pruebas Automatizadas (Backend):**
   - Tests con Jest para el middleware `verifyAuth` (verificación de JWT válido, expirado o manipulado).
   - Tests para `checkGuildPermissions` (validación de admin/manage guild vs usuario común sin permisos).
   - Tests de endpoints `/api/guilds/:guildId/config` (lectura y patch en base de datos PostgreSQL de prueba).
2. **Pruebas de Compilación (Frontend):**
   - Ejecución de `npm run build` en el directorio `dashboard/` asegurando 0 errores de compilación y empaquetado de assets estáticos.
3. **Pruebas de Integración y Despliegue:**
   - Levantamiento del contenedor en local / VPS mediante Docker Compose.
   - Comprobación de que `GET http://localhost:3000/` sirve la aplicación React.
   - Comprobación de que `GET http://localhost:3000/ready` y `GET /health` siguen respondiendo `200 OK`.
   - Flujo completo de login con Discord OAuth2 en entorno real.
