# Especificación de Diseño: Sub-proyecto B — Seguridad, Transcripts & Respaldos

**Fecha:** 2026-09-05  
**Estado:** Aprobado para implementación  
**Alcance:** Sub-proyecto B (TitanBot v1.1+)  
**Componentes:** Ticket Web Transcripts, Anti-Raid Shield, Server Snapshots & Backups  

---

## 1. Resumen Ejecutivo y Objetivos

El Sub-proyecto B refuerza las capacidades de seguridad, auditoría y resiliencia de TitanBot mediante tres subsistemas modulares de nivel empresarial:

1. **Ticket Web Transcripts & Viewer:** Captura completa de mensajes, avatares, embeds y adjuntos de tickets al cerrarse o eliminarse. Almacenamiento estructurado en PostgreSQL, visor web interactivo con tema oscuro idéntico a Discord, generación de enlaces web firmados con token criptográfico (HMAC/Secure Token) y exportación en HTML autocontenido offline.
2. **Anti-Raid Shield:** Detección proactiva de ataques de bots y ráfagas masivas de uniones (*join burst*) mediante ventana deslizante en memoria (*sliding window*). Reglas configurables de umbral temporal, filtro de antigüedad de cuenta de Discord (*minAccountAge*), acciones automáticas escalables (Asignar Cuarentena, Kick, Ban), *lockdown* temporal de canales y botón de emergencia para levantar el bloqueo.
3. **Server Snapshots & Backup:** Creación de instantáneas completas de la arquitectura del servidor (roles, categorías, canales de texto/voz/anuncios, temas, posiciones y matriz de sobreescrituras de permisos). Almacenamiento en base de datos, exportación/importación en formato JSON, diffing y motor de restauración inteligente (Modo Seguro Aditivo y Modo Reemplazo) con control de *rate limits* de Discord.

---

## 2. Subsistema 1: Ticket Web Transcripts & Viewer

### 2.1 Modelo de Datos & Esquema Zod

```javascript
// src/utils/schemas/transcriptSchema.js
import { z } from 'zod';

export const TranscriptMessageSchema = z.object({
  id: z.string(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    discriminator: z.string().optional(),
    avatarUrl: z.string().nullable().optional(),
    bot: z.boolean().default(false),
  }),
  content: z.string().default(''),
  embeds: z.array(z.record(z.any())).default([]),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    size: z.number().optional(),
    contentType: z.string().nullable().optional(),
  })).default([]),
  createdAt: z.string(),
  pinned: z.boolean().default(false),
});

export const TicketTranscriptSchema = z.object({
  id: z.string(), // ID único del transcript (UUIDv4)
  guildId: z.string().regex(/^\d{17,20}$/),
  channelId: z.string().regex(/^\d{17,20}$/),
  ticketNumber: z.string().or(z.number()),
  title: z.string().default('Ticket Transcript'),
  ticketCreatorId: z.string().regex(/^\d{17,20}$/),
  ticketCreatorTag: z.string().default('Unknown User'),
  closedById: z.string().regex(/^\d{17,20}$/).optional(),
  closedByTag: z.string().optional(),
  closeReason: z.string().default('Ticket closed'),
  createdAt: z.string(), // ISO String creación del ticket
  closedAt: z.string(),  // ISO String cierre
  messageCount: z.number().default(0),
  viewToken: z.string(), // Token criptográfico firmado para visualización web segura
  messages: z.array(TranscriptMessageSchema).default([]),
});
```

### 2.2 Almacenamiento en Base de Datos

- **Claves canónicas:**
  - Registro individual: `guild:${guildId}:transcript:${transcriptId}`
  - Índice de transcripts del servidor: `guild:${guildId}:transcripts:index` (ordenado cronológicamente por `closedAt` descendente, con retención de hasta 100 transcripts).

### 2.3 Servicio: `src/services/transcripts/transcriptService.js`

- **`captureChannelTranscript(channel, options)`**:
  - Paginación inversa mediante `channel.messages.fetch({ limit: 100, before })` hasta recuperar el historial completo.
  - Normaliza mensajes extrayendo autor, avatar, contenido saneado, embeds y adjuntos.
  - Genera `viewToken` seguro mediante `crypto.randomBytes(24).toString('hex')`.
  - Genera HTML autocontenido offline con estilos CSS Discord Dark (avatares redondos, badges BOT, embeds con bordes coloreados, timestamps legibles y responsive).
  - Guarda en PostgreSQL y actualiza el índice.
  - Retorna `{ transcript, html, viewUrl }`.
- **`getGuildTranscripts(guildId, { limit, offset, search })`**:
  - Lista paginada con filtrado por creador, ticket number o motivo de cierre.
- **`getTranscriptById(guildId, transcriptId)`**:
  - Recupera metadatos y array de mensajes.
- **`renderStandaloneHtml(transcript)`**:
  - Retorna el documento HTML completo para exportación o visualización web.
- **`validateViewToken(transcriptId, token)`**:
  - Verifica si el token coincide para permitir visualización pública sin inicio de sesión.

### 2.4 Endpoints API

- `GET /api/guilds/:guildId/transcripts` (Auth + Mod/Staff access): Lista paginada de transcripts.
- `GET /api/guilds/:guildId/transcripts/:id` (Auth + Mod/Staff access): Detalle del transcript en JSON.
- `GET /api/guilds/:guildId/transcripts/:id/download` (Auth + Mod/Staff access): Descarga de archivo `.html`.
- `DELETE /api/guilds/:guildId/transcripts/:id` (Auth + Admin access): Eliminación de registro.
- `GET /api/transcripts/:id` (Público con token query param `?token=...`): Renderiza directamente el HTML en navegador.

---

## 3. Subsistema 2: Anti-Raid Shield

### 3.1 Modelo de Datos & Esquema Zod

```javascript
// src/utils/schemas/antiRaidSchema.js
import { z } from 'zod';

export const AntiRaidConfigSchema = z.object({
  enabled: z.boolean().default(false),
  joinThreshold: z.number().int().min(3).max(50).default(5), // Miembros en ventana
  windowSeconds: z.number().int().min(3).max(60).default(10), // Segundos de la ventana
  minAccountAgeHours: z.number().int().min(0).max(720).default(24), // Edad mínima (0 = inactivo)
  action: z.enum(['quarantine', 'kick', 'ban']).default('quarantine'),
  quarantineRoleId: z.string().regex(/^\d{17,20}$/).nullable().optional().default(null),
  lockdownOnRaid: z.boolean().default(false), // Bloqueo temporal de canales
  lockdownChannelIds: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  alertChannelId: z.string().regex(/^\d{17,20}$/).nullable().optional().default(null),
  isLockdownActive: z.boolean().default(false),
  lastRaidTimestamp: z.string().nullable().optional().default(null),
});
```

### 3.2 Servicio: `src/services/security/antiRaidService.js`

- **Ventana Deslizante en Memoria (`joinsCache`):**
  - Mantiene una cola en memoria por cada `guildId`: `[{ userId, joinedAt, createdAt }]`.
  - Al recibir el evento `guildMemberAdd`:
    1. Si `!config.enabled`, descarta inmediatamente.
    2. Limpia registros más viejos que `Date.now() - (config.windowSeconds * 1000)`.
    3. Registra al nuevo miembro.
    4. Verifica filtro de cuenta nueva: Si `minAccountAgeHours > 0` y la cuenta fue creada hace menos de ese tiempo, se marca como sospechosa.
    5. Si el conteo de la ventana supera `joinThreshold` o la tasa de cuentas nuevas sospechosas explota: **Raid Detectado**.
- **Ejecución de Acciones:**
  - `quarantine`: Asigna `quarantineRoleId` a los miembros identificados en la ráfaga.
  - `kick`: Expulsa con razón de auditoría `[TitanBot Anti-Raid] Join burst detected`.
  - `ban`: Banea con borrado de mensajes recientes (1 día).
  - Si `lockdownOnRaid`: Itera `lockdownChannelIds` (o canales de texto públicos si la lista está vacía) y desactiva `SendMessages` para `@everyone`. Marca `isLockdownActive = true`.
- **Alerta de Emergencia:**
  - Publica un embed de alta prioridad en `alertChannelId` (o en el canal de logs de moderación) detallando número de cuentas afectadas, acción tomada y estado de lockdown.
- **Desbloqueo de Emergencia (`liftLockdown(guildId, client)`):**
  - Restaura los permisos originales de `@everyone` en los canales bloqueados y restablece `isLockdownActive = false`.

### 3.3 Endpoints API

- `GET /api/guilds/:guildId/antiraid` (Auth + Mod access): Obtiene configuración y estado activo.
- `PATCH /api/guilds/:guildId/antiraid` (Auth + Admin access): Actualiza umbrales y acciones.
- `POST /api/guilds/:guildId/antiraid/lockdown/toggle` (Auth + Admin access): Activa/Desactiva manualmente el lockdown de emergencia.

---

## 4. Subsistema 3: Server Snapshots & Backup

### 4.1 Modelo de Datos & Esquema Zod

```javascript
// src/utils/schemas/snapshotSchema.js
import { z } from 'zod';

export const RoleSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number(),
  hoist: z.boolean(),
  position: z.number(),
  permissions: z.string(), // Bitfield string
  mentionable: z.boolean(),
});

export const OverwriteSnapshotSchema = z.object({
  id: z.string(),
  type: z.number(), // 0 = Role, 1 = Member
  allow: z.string(), // Bitfield string
  deny: z.string(),  // Bitfield string
});

export const ChannelSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  parentId: z.string().nullable().optional(),
  position: z.number(),
  topic: z.string().nullable().optional(),
  nsfw: z.boolean().default(false),
  bitrate: z.number().optional(),
  userLimit: z.number().optional(),
  permissionOverwrites: z.array(OverwriteSnapshotSchema).default([]),
});

export const ServerSnapshotSchema = z.object({
  id: z.string(), // UUIDv4
  guildId: z.string().regex(/^\d{17,20}$/),
  name: z.string(),
  createdAt: z.string(),
  createdBy: z.object({
    id: z.string(),
    tag: z.string(),
  }),
  counts: z.object({
    roles: z.number(),
    categories: z.number(),
    channels: z.number(),
  }),
  roles: z.array(RoleSnapshotSchema),
  channels: z.array(ChannelSnapshotSchema),
});
```

### 4.2 Servicio: `src/services/snapshots/snapshotService.js`

- **`createSnapshot(guild, author)`**:
  - Extrae roles que no son administrados por bots ni `@everyone` (`!role.managed && role.id !== guild.id`).
  - Extrae canales y categorías ordenados por posición.
  - Guarda en `guild:${guildId}:snapshot:${id}` e indexa en `guild:${guildId}:snapshots:index`.
- **`getGuildSnapshots(guildId)`**:
  - Retorna la lista de instantáneas con metadata (máximo 15 por servidor).
- **`restoreSnapshot(guild, snapshotId, mode = 'safe_sync')`**:
  - **Modo Seguro (`safe_sync`):**
    1. Compara roles: crea los roles faltantes con sus colores y permisos.
    2. Compara categorías y canales: crea los faltantes y actualiza nombres/posiciones.
    3. Aplica `permissionOverwrites` mapeando IDs antiguos a nuevos si fueron recreados.
    4. No elimina ningún canal o rol creado posteriormente.
  - **Modo Reemplazo (`full_replace`):**
    1. Elimina canales no presentes en la instantánea.
    2. Reconstruye la jerarquía idéntica.
  - Pacing con retardo de 250ms entre llamadas Discord para prevenir `429 Too Many Requests`.

### 4.3 Endpoints API

- `GET /api/guilds/:guildId/snapshots` (Auth + Admin access): Lista de snapshots.
- `POST /api/guilds/:guildId/snapshots` (Auth + Admin access): Crea un snapshot nuevo.
- `GET /api/guilds/:guildId/snapshots/:id/export` (Auth + Admin access): Descarga JSON.
- `POST /api/guilds/:guildId/snapshots/import` (Auth + Admin access): Carga y valida JSON.
- `POST /api/guilds/:guildId/snapshots/:id/restore` (Auth + Admin access): Ejecuta restauración con modo especificado.
- `DELETE /api/guilds/:guildId/snapshots/:id` (Auth + Admin access): Elimina una copia.

---

## 5. Integración con el Panel Web (Frontend Dashboard)

1. **Pestaña Tickets:**
   - Añadir selector de sub-pestaña: `[Panel Interactivo]` y `[Historial & Transcripts]`.
   - Tabla de transcripts con buscador por ID/Usuario, fecha, botón de previsualización modal Discord Dark y botón de descarga de HTML.
2. **Pestaña Moderación:**
   - Añadir sub-sección "Escudo Anti-Raid":
     - Switch de encendido/apagado.
     - Sliders de umbral: Número de miembros (3-50) y Ventana de tiempo en segundos (3-60).
     - Selector de Acción: Cuarentena / Expulsión (Kick) / Bloqueo (Ban).
     - Selector de Rol de Cuarentena.
     - Toggle de Lockdown automático y botón de pánico "Desbloquear Servidor Ahora".
3. **Pestaña Copias de Seguridad (Snapshots):**
   - Nueva pestaña en la barra lateral (`Sidebar.jsx`): `Snapshots` (icono de disco / escudo).
   - Botón "Crear Instantánea Ahora" y "Subir Copia (.json)".
   - Tarjetas de historial con conteo de roles/canales, fecha, usuario, botón de descarga JSON y botón de Restauración (con modal de confirmación y advertencia).
4. **Internacionalización (i18n):**
   - Incorporar claves completas en `es-419.json`, `en-US.json` y `de.json` con 100% de paridad.

---

## 6. Plan de Pruebas y Verificación

1. **Pruebas Unitarias Automatizadas:**
   - `tests/unit/transcripts.test.js`: generación de transcript HTML, sanitización de entradas, validación de esquemas Zod, generación y verificación de token seguro.
   - `tests/unit/antiRaid.test.js`: ventana deslizante, detección de ráfagas, filtro de edad de cuenta, acciones de cuarentena y llamadas a lockdown.
   - `tests/unit/snapshots.test.js`: captura de estructura, serialización JSON, validación de esquema, diffing y lógica de restauración segura.
2. **Pruebas de Regresión:**
   - Ejecutar suite completa `npm test` verificando que los 153 tests existentes sigan en verde.
3. **Compilación del Frontend:**
   - Ejecutar `npm run build:dashboard` para certificar cero errores de sintaxis o bundle.
