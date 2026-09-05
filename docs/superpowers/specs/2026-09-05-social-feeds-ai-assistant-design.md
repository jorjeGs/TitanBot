# Especificación de Diseño: Notificaciones Externas (Social Feeds / Webhooks) & Asistente IA para la Comunidad

**Fecha:** 2026-09-05  
**Estado:** Listo para Implementación  
**Alcance:** TitanBot v1.1+ (Capacidades de Integración Social & Inteligencia Artificial)  
**Componentes:** Servicio de Polling Social (YouTube RSS, Twitch Helix, RSS/Atom, Inbound Webhooks), Servicio Asistente IA (Google Gemini 2.0 Flash, Inyección de Base de Conocimiento / FAQ, Cooldowns y Mention Triggers), API REST, Web Dashboard (`SocialFeedsTab.jsx`, `AiAssistantTab.jsx`) y Soporte Trilingüe (`es-419`, `en-US`, `de`).

---

## 1. Resumen Ejecutivo y Objetivos

Esta especificación cubre dos pilares estratégicos orientados a potenciar la participación, dinamismo y soporte autónomo de las comunidades de Discord administradas por TitanBot:

### 1.1 Notificaciones Externas & Social Feeds (Pilar 1)
- **YouTube Alerts:** Detección de nuevos videos y directos mediante feeds RSS oficiales de YouTube (`https://www.youtube.com/feeds/videos.xml?channel_id=...`). Consume **0 cuota** de la YouTube Data API v3 y opera con máxima velocidad y fiabilidad.
- **Twitch Stream Alerts:** Monitoreo en vivo para streamers vía Twitch Helix API, detectando transición de estado `offline` a `live`, con thumbnail de vista previa, título de transmisión y categoría de juego.
- **Custom RSS / Atom Feeds:** Soporte universal para blogs de noticias, anuncios oficiales, Reddit o podcasts mediante parsing XML nativo sin dependencias pesadas.
- **Inbound Custom Webhooks:** Receptor seguro `POST /api/webhooks/incoming/:guildId/:feedId?token=...` que permite a plataformas externas (GitHub, GitLab, Shopify, WooCommerce, Zapier, Make) enviar eventos formateados directamente a canales de Discord.

### 1.2 Asistente IA para la Comunidad (Pilar 2)
- **Motor Google Gemini 2.0 Flash:** Respuestas ultrarrápidas, inteligentes y contextualizadas empleando la API de Google Gemini (o Gemini 1.5 Flash).
- **RAG Ligero & Base de Conocimientos (Knowledge Base):** Inyección contextual de reglas del servidor, preguntas frecuentes (FAQ), horarios, enlaces oficiales y guías configuradas por los administradores en el dashboard.
- **Activación Controlada:** Soporte para canales dedicados (ej. `#preguntas-ia`, donde responde a todo mensaje) y/o menciones globales (`@TitanBot`).
- **Protección Antispam & Cooldowns:** Cooldown por usuario (ej. 10-15s), control de longitud y filtrado de roles ignorados.
- **Simulador en Vivo:** Playground integrado en el Dashboard para que los administradores prueben y ajusten la personalidad y respuestas del asistente antes de activarlo a la comunidad.

---

## 2. Modelo de Datos y Esquemas Zod (`src/utils/schemas.js`)

### 2.1 Social Feeds Schema
```javascript
export const SocialFeedItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['youtube', 'twitch', 'rss', 'webhook']),
  name: z.string().trim().min(1).max(100),
  enabled: z.boolean().default(true),
  targetChannelId: z.string().regex(/^\d{17,20}$/, 'Invalid Discord channel ID'),
  customMessage: z.string().max(2000).default('{author} ha publicado contenido nuevo: {title}\n{url}'),
  mentionRole: z.string().nullable().optional().default(null), // '@everyone', '@here', o roleId
  // Platform specific parameters
  youtubeChannelId: z.string().optional().default(''),
  twitchUsername: z.string().optional().default(''),
  rssFeedUrl: z.string().url().optional().or(z.literal('')).default(''),
  webhookToken: z.string().optional().default(''),
  // State metadata
  lastItemId: z.string().nullable().optional().default(null),
  lastPublished: z.string().nullable().optional().default(null),
  lastChecked: z.string().nullable().optional().default(null),
  isLive: z.boolean().optional().default(false),
});

export const SocialFeedsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  checkIntervalMinutes: z.number().int().min(1).max(60).default(5),
  feeds: z.array(SocialFeedItemSchema).default([]),
}).default({ enabled: true, checkIntervalMinutes: 5, feeds: [] });
```

### 2.2 AI Assistant Schema
```javascript
export const KnowledgeItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(150),
  content: z.string().trim().min(1).max(4000),
  tags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const AiAssistantConfigSchema = z.object({
  enabled: z.boolean().default(false),
  model: z.string().default('gemini-2.0-flash'),
  systemPrompt: z.string().max(4000).default(
    'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, servicial, conciso y respetuoso. Usa la base de conocimiento provista para responder preguntas sobre las reglas, canales y servicios del servidor.'
  ),
  allowedChannelIds: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  respondToMentions: z.boolean().default(true),
  ignoredRoleIds: z.array(z.string().regex(/^\d{17,20}$/)).default([]),
  cooldownSeconds: z.number().int().min(1).max(300).default(10),
  maxOutputTokens: z.number().int().min(50).max(2048).default(500),
  temperature: z.number().min(0).max(1).default(0.7),
  knowledgeBase: z.array(KnowledgeItemSchema).default([]),
}).default({
  enabled: false,
  model: 'gemini-2.0-flash',
  systemPrompt: 'Eres el Asistente Virtual oficial de la comunidad en Discord. Eres amigable, servicial, conciso y respetuoso.',
  allowedChannelIds: [],
  respondToMentions: true,
  ignoredRoleIds: [],
  cooldownSeconds: 10,
  maxOutputTokens: 500,
  temperature: 0.7,
  knowledgeBase: [],
});
```

---

## 3. Claves Canónicas en Base de Datos (`src/utils/database/keys.js`)

- `getSocialFeedsKey(guildId)`: `guild:${guildId}:socialfeeds:config`
- `getAiAssistantKey(guildId)`: `guild:${guildId}:aiassistant:config`

---

## 4. Servicios Backend

### 4.1 `src/services/social/socialFeedService.js`
- `fetchYouTubeLatest(channelId)`: Descarga el XML RSS de `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}` y extrae el id del video más reciente, título, autor, thumbnail y fecha de publicación.
- `fetchTwitchStatus(username, credentials)`: Consulta la API de Twitch Helix para verificar si el canal está transmitiendo en vivo, obteniendo título, juego y visor count.
- `fetchRssLatest(feedUrl)`: Parser RSS/Atom ultraliviano nativo que procesa `<item>` / `<entry>`.
- `dispatchSocialAnnouncement(client, guildId, feed, itemData)`: Construye el Embed de Discord con los colores distintivos de cada plataforma, reemplaza variables en el mensaje (`{author}`, `{title}`, `{url}`) y publica en el canal configurado con pings de rol opcionales.
- `checkAllSocialFeeds(client)`: Ejecutor periódico (invocado por cron cada 5 minutos) que itera los servidores, verifica las fuentes activas y despacha las alertas de nuevos contenidos.

### 4.2 `src/services/ai/aiAssistantService.js`
- `generateAiResponse({ guildConfig, userMessage, authorTag, guildName })`:
  - Ensambla el System Prompt con las directrices del servidor y la base de conocimiento activa.
  - Llama a la API de Gemini (`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`).
  - Aplica fallback seguro si la clave no está configurada o hay error de cuota/red.
- `handleAiChatMessage(message, client)`:
  - Verifica si el mensaje califica (canal permitido o mención directa `@TitanBot`).
  - Evalúa roles ignorados y cooldown de usuario en memoria.
  - Envía indicador de escritura en Discord (`message.channel.sendTyping()`).
  - Publica la respuesta generada con split automático si excede 2000 caracteres.

---

## 5. Endpoints REST API

Montados en `src/api/routes/guildRoutes.js`:

### 5.1 Social Feeds
- `GET /api/guilds/:guildId/socialfeeds`
- `POST /api/guilds/:guildId/socialfeeds` (Crear o actualizar un feed)
- `DELETE /api/guilds/:guildId/socialfeeds/:id`
- `POST /api/guilds/:guildId/socialfeeds/:id/test` (Envío inmediato de prueba al canal)
- `POST /api/webhooks/incoming/:guildId/:feedId` (Recepción de webhooks externos)

### 5.2 AI Assistant
- `GET /api/guilds/:guildId/aiassistant`
- `PATCH /api/guilds/:guildId/aiassistant` (Actualizar configuración y parámetros del modelo)
- `POST /api/guilds/:guildId/aiassistant/test` (Simulador de respuestas para el dashboard)
- `POST /api/guilds/:guildId/aiassistant/knowledge` (Añadir o editar entrada de conocimiento)
- `DELETE /api/guilds/:guildId/aiassistant/knowledge/:id`

---

## 6. Frontend Web Dashboard

- `dashboard/src/pages/manage/SocialFeedsTab.jsx`:
  - Gestión completa de alertas (YouTube, Twitch, RSS, Webhook).
  - Selector de canales con canales de texto de Discord.
  - Botón de prueba instantánea de alerta.
  - Previsualización en vivo del Embed de alerta.
- `dashboard/src/pages/manage/AiAssistantTab.jsx`:
  - Switch maestro de activación.
  - Selector de canales dedicados y toggle de menciones.
  - Editor de Prompt de Sistema y sliders de Temperatura / Longitud.
  - Gestor de Base de Conocimiento (FAQ, reglas, links).
  - Consola interactiva de prueba (Playground) con respuesta en tiempo real.
- `dashboard/src/components/layout/Sidebar.jsx` & `App.jsx`:
  - Integración de ambas pestañas con lazy loading.
- `dashboard/src/locales/{es-419,en-US,de}.json`:
  - Paridad del 100% en los tres idiomas soportados.

---

## 7. Estrategia de Pruebas & Verificación

1. **Pruebas Unitarias Automatizadas:**
   - `tests/unit/socialFeeds.test.js`: Validación de esquemas, parser RSS/YouTube, construcción de embeds y debounce de publicaciones repetidas.
   - `tests/unit/aiAssistant.test.js`: Validación de esquemas, ensamblaje de prompts con base de conocimiento, cooldowns y control de mensajes.
   - Verificación de no-regresión de las 176 pruebas existentes (`npm test`).
2. **Pruebas de Compilación Frontend:**
   - `npm run build:dashboard`: Compilación limpia con Vite sin errores ni advertencias de importación.
3. **Despliegue y Validación en VPS Staging:**
   - Pull en `compucita`, reconstrucción de contenedor Docker `titanbot` y verificación de salud (`/health`).
