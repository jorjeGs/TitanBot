# Especificación Técnica de Diseño: Hub de Automatizaciones y Mensajería Dinámica (Sub-proyecto A)

**Fecha:** 2026-09-05  
**Rama:** `feat/improvements-exploration`  
**Estado:** Aprobado / Pendiente de Plan de Implementación  
**Autor:** Antigravity & Jorge  

---

## 1. Contexto y Objetivos

A través del análisis competitivo de plataformas líderes de Discord (MEE6, Carl-bot, ProBot, YAGPDB) y repositorios open-source modernos en GitHub, se identificó que la **mensajería dinámica y las automatizaciones en canales** constituyen uno de los conjuntos de características más valorados por las comunidades, y que actualmente se encuentran comúnmente bloqueados detrás de muros de pago (*paywalls* de hasta $5-$15 USD/mes por servidor).

El objetivo de este **Sub-proyecto A** es dotar a **TitanBot** de un **Hub de Automatizaciones y Mensajería Dinámica** 100% nativo, persistente, trilingüe (`es-419`, `en-US`, `de`) y visualmente interactivo en el Web Dashboard, compuesto por:
1. **Sticky Messages:** Mensajes fijados que se auto-republican de forma inteligente al fondo de canales específicos cuando los miembros conversan, con umbrales configurables y anti-ráfagas.
2. **Scheduled Messages (Avisos Programados / Cron):** Tareas periódicas para difundir anuncios recurrentes con soporte de texto plano o Rich Embeds y selector amigable de periodicidad.
3. **Auto-Responders & Triggers:** Sistema de disparadores basados en coincidencia exacta, subcadena (*contains*) o expresiones regulares (*regex*), con filtros de canal, roles excluidos y respuestas en canal o por mensaje directo (DM).

---

## 2. Modelo de Datos y Esquemas Zod

La configuración de las automatizaciones se integrará en el objeto `guildConfig` persistido en PostgreSQL a través de [`src/utils/schemas.js`](file:///c:/Users/Laptop-150/jorge/TitanBot/src/utils/schemas.js):

### 2.1. Sub-esquema de Embeds
```javascript
export const AutomationEmbedSchema = z.object({
  title: z.string().max(256).optional().default(''),
  description: z.string().max(4096).optional().default(''),
  color: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional().default('#5865F2'),
  footer: z.string().max(2048).optional().default(''),
  image: z.string().url().or(z.literal('')).optional().default(''),
  thumbnail: z.string().url().or(z.literal('')).optional().default(''),
});
```

### 2.2. Esquema de Sticky Messages
```javascript
export const StickyMessageSchema = z.object({
  id: z.string(),
  channelId: SnowflakeSchema,
  enabled: z.boolean().default(true),
  type: z.enum(['text', 'embed']).default('text'),
  content: z.string().max(2000).optional().default(''),
  embed: AutomationEmbedSchema.default({}),
  messageCountThreshold: z.number().int().min(1).max(100).default(3),
  cooldownSeconds: z.number().int().min(0).max(300).default(5),
  lastMessageId: SnowflakeSchema.nullable().optional().default(null),
});
```

### 2.3. Esquema de Scheduled Messages
```javascript
export const ScheduledMessageSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  channelId: SnowflakeSchema,
  enabled: z.boolean().default(true),
  type: z.enum(['text', 'embed']).default('text'),
  content: z.string().max(2000).optional().default(''),
  embed: AutomationEmbedSchema.default({}),
  scheduleType: z.enum(['interval', 'daily', 'weekly', 'cron']).default('daily'),
  intervalHours: z.number().int().min(1).max(168).optional().default(24),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().default('12:00'), // UTC HH:mm
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([1, 2, 3, 4, 5]),
  cronExpression: z.string().max(100).optional().default('0 12 * * *'),
  lastRunAt: z.string().datetime().nullable().optional().default(null),
});
```

### 2.4. Esquema de Auto-Responders
```javascript
export const AutoResponderSchema = z.object({
  id: z.string(),
  trigger: z.string().min(1).max(200),
  matchType: z.enum(['exact', 'contains', 'regex']).default('contains'),
  caseSensitive: z.boolean().default(false),
  replyType: z.enum(['channel', 'dm']).default('channel'),
  type: z.enum(['text', 'embed']).default('text'),
  content: z.string().max(2000).optional().default(''),
  embed: AutomationEmbedSchema.default({}),
  enabled: z.boolean().default(true),
  allowedChannels: z.array(SnowflakeSchema).default([]),
  ignoredRoles: z.array(SnowflakeSchema).default([]),
  cooldownSeconds: z.number().int().min(0).max(3600).default(5),
});
```

### 2.5. Raíz en `GuildConfigSchema`
```javascript
automations: z.object({
  stickyMessages: z.array(StickyMessageSchema).default([]),
  scheduledMessages: z.array(ScheduledMessageSchema).default([]),
  autoResponders: z.array(AutoResponderSchema).default([]),
}).default({}),
```

---

## 3. Arquitectura del Backend y Servicios

### 3.1. `src/services/automations/stickyMessageService.js`
* **Acoplamiento:** Se suscribe al evento [`messageCreate.js`](file:///c:/Users/Laptop-150/jorge/TitanBot/src/events/messageCreate.js).
* **Control de Concurrencia:** Emplea un cerrojo por canal (`Map<string, boolean>`) para evitar reentrancia ante ráfagas de chat.
* **Flujo de Ejecución:**
  1. Ignora mensajes de bots o generados por el propio sticky message.
  2. Verifica si el canal posee un `stickyMessage` habilitado.
  3. Incrementa el contador en memoria `channelMessageCounters.get(channelId)`.
  4. Si `contador >= messageCountThreshold` y transcurrió `cooldownSeconds`:
     - Intenta eliminar `sticky.lastMessageId` en Discord (atrapando y silenciando el error `10008: Unknown Message`).
     - Envía el nuevo mensaje o embed (interpolando `{server}`, `{channel}`, `{memberCount}`).
     - Actualiza `lastMessageId = sentMessage.id` en PostgreSQL mediante `updateGuildConfig`.
     - Reinicia el contador del canal a 0.

### 3.2. `src/services/automations/scheduledMessageService.js`
* **Acoplamiento:** Integrado en el temporizador por minuto `node-cron` que ya corre en [`src/app.js`](file:///c:/Users/Laptop-150/jorge/TitanBot/src/app.js).
* **Flujo de Ejecución:**
  1. Itera sobre las guilds activas en caché.
  2. Para cada `scheduledMessage` habilitado, evalúa si la hora actual coincide con su regla temporal:
     - `daily`: Compara hora y minuto UTC contra `timeOfDay`.
     - `weekly`: Compara día actual (`0-6`), hora y minuto UTC.
     - `interval`: Verifica si `(ahora - lastRunAt) >= intervalHours * 3600 * 1000`.
     - `cron`: Evalúa la expresión cron contra la marca de tiempo actual.
  3. Envía el mensaje/embed al canal especificado.
  4. Actualiza `lastRunAt = new Date().toISOString()`.
  5. Captura errores de permisos (`50013: Missing Permissions`) de forma no bloqueante.

### 3.3. `src/services/automations/autoResponderService.js`
* **Acoplamiento:** Se ejecuta en [`messageCreate.js`](file:///c:/Users/Laptop-150/jorge/TitanBot/src/events/messageCreate.js) tras el procesamiento de comandos y conteo.
* **Flujo de Ejecución:**
  1. Descarta mensajes de bots.
  2. Filtra reglas habilitadas de la guild.
  3. Descarta si `allowedChannels.length > 0` y `channelId` no está en la lista.
  4. Descarta si el autor posee algún rol presente en `ignoredRoles`.
  5. Evaluación de coincidencia:
     - `exact`: Compara cadenas respetando o no `caseSensitive`.
     - `contains`: Subcadena (`includes`).
     - `regex`: Limita longitud del patrón a 100 caracteres. Evalúa la expresión de manera segura.
  6. Comprueba cooldown en memoria por clave `${ruleId}_${userId}`.
  7. Envía respuesta en el canal (`message.channel.send`) o por privado (`message.author.send`).
  8. Captura error `50007: Cannot send messages to this user` de forma segura.

### 3.4. API REST Endpoints (`src/api/routes/guildRoutes.js`)
* `GET /api/guilds/:guildId/automations`: Retorna el estado y los 3 arreglos de reglas.
* `POST /api/guilds/:guildId/automations/sticky`: Crea o actualiza una regla de sticky message.
* `DELETE /api/guilds/:guildId/automations/sticky/:id`: Elimina un sticky message y desactiva su monitoreo.
* `POST /api/guilds/:guildId/automations/scheduled`: Crea o actualiza un aviso programado.
* `POST /api/guilds/:guildId/automations/scheduled/:id/trigger`: Dispara un envío de prueba inmediato a Discord.
* `DELETE /api/guilds/:guildId/automations/scheduled/:id`: Elimina un aviso programado.
* `POST /api/guilds/:guildId/automations/auto-responders`: Crea o actualiza un disparador automático.
* `DELETE /api/guilds/:guildId/automations/auto-responders/:id`: Elimina un auto-responder.

---

## 4. Diseño del Web Dashboard y Previsualización

### 4.1. Navegación
* [`Sidebar.jsx`](file:///c:/Users/Laptop-150/jorge/TitanBot/dashboard/src/components/layout/Sidebar.jsx): Enlace con icono `Zap` y etiqueta `sidebar.automations`.
* [`App.jsx`](file:///c:/Users/Laptop-150/jorge/TitanBot/dashboard/src/App.jsx): Ruta `/servers/:guildId/automations` asociada a [`AutomationsTab.jsx`](file:///c:/Users/Laptop-150/jorge/TitanBot/dashboard/src/pages/manage/AutomationsTab.jsx).

### 4.2. Pestaña Principal: [`AutomationsTab.jsx`](file:///c:/Users/Laptop-150/jorge/TitanBot/dashboard/src/pages/manage/AutomationsTab.jsx)
* **Sub-pestaña 1 (Sticky Messages):**
  - Lista de fijados activos por canal con conmutadores toggle on/off.
  - Editor modal/panel: selector de canal, slider de umbral (1 a 20 mensajes), selector dual Texto vs. Embed, paleta de colores Discord, banner y píldoras clicables (`{server}`, `{channel}`, `{memberCount}`).
* **Sub-pestaña 2 (Avisos Programados):**
  - Lista con badges de periodicidad, horario, indicador de último envío y botón de prueba ("Enviar de prueba").
  - Formulario de creación con selector de frecuencia (intervalo, diario, días semanales, cron) y editor de mensaje/embed.
* **Sub-pestaña 3 (Auto-Responders):**
  - Tabla de disparadores con badges (`[Exacto]`, `[Contiene]`, `[Regex]`), destino (`[Canal]` vs `[DM]`) y lista de canales/roles.
  - Formulario de creación con disparador, selector de coincidencia, selector de destino, multi-select de canales y roles ignorados, cooldown en segundos y editor de respuesta.

### 4.3. Previsualizador en Vivo: [`AutomationPreview.jsx`](file:///c:/Users/Laptop-150/jorge/TitanBot/dashboard/src/components/preview/AutomationPreview.jsx)
* Emula fielmente la interfaz de un canal de Discord en modo oscuro.
* Muestra el avatar y badge de `BOT` de TitanBot.
* Sustituye en vivo las variables `{server}`, `{channel}`, `{user}`, `{memberCount}` por valores representativos mientras el usuario redacta.

### 4.4. Internacionalización Total (i18n)
* Claves exhaustivas en `es-419.json`, `en-US.json` y `de.json` bajo la raíz `"automations"`, abarcando todas las etiquetas, botones, tooltips, modales y mensajes de validación.

---

## 5. Plan de Verificación y Pruebas

### 5.1. Pruebas Automatizadas (`tests/unit/automations.test.js`)
* Validación de esquemas Zod (campos requeridos, tipos válidos, rechazo de datos erróneos).
* Pruebas del servicio de Sticky Messages (simulación de eventos de mensaje, incremento de contadores, eliminación del mensaje anterior y regeneración al umbral).
* Pruebas del servicio de Scheduled Messages (evaluación de tiempos por cron y periodicidad, actualización de `lastRunAt`).
* Pruebas del servicio de Auto-Responders (coincidencias exactas, subcadenas, regex seguro, filtros de canal y rol, límites de cooldown).
* Pruebas de integración de la API REST (endpoints CRUD, autenticación y permisos).

### 5.2. Verificación de Compilación y Calidad
* Ejecución de `npm test` garantizando 100% de tests aprobados.
* Ejecución de `npm run build:dashboard` con Vite asegurando 0 advertencias o errores de empaquetado.
