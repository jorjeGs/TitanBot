# Especificación de Diseño: Sub-proyecto C — Analíticas & Métricas del Servidor (Server Insights)

**Fecha:** 2026-09-05  
**Estado:** Listo para Implementación  
**Alcance:** Sub-proyecto C (TitanBot v1.1+)  
**Componentes:** Recolección de métricas en tiempo real, API REST de Analíticas, Matriz de Calor Semanal 7x24, Gráficos de Crecimiento y Dashboard de Estadísticas Avanzadas.  

---

## 1. Resumen Ejecutivo y Objetivos

El **Sub-proyecto C: Analíticas & Métricas del Servidor** provee a los administradores y moderadores de servidores de Discord una suite analítica completa y visualmente rica, sin recurrir a servicios externos de pago.

### Objetivos Clave:
1. **Rastreo Automático y Continuo de Crecimiento:** Captura uniones (`guildMemberAdd`) y salidas (`guildMemberRemove`) agregadas por día para calcular el crecimiento neto y retención.
2. **Mapa de Calor Semanal 7x24 (Weekly Activity Heatmap):** Matriz de 7 días (Lunes a Domingo) por 24 horas que identifica con precisión quirúrgica los momentos de mayor interacción en el chat.
3. **Distribución de Canales & Top Engagement:** Monitoreo del volumen de mensajes por canal de texto para evaluar qué secciones de la comunidad generan mayor dinamismo.
4. **Baseline Inteligente e Histórico Inmediato:** En servidores recién añadidos o donde las analíticas comienzan hoy, el sistema inicializa una serie histórica coherente calculando fechas de unión reales de los miembros (`member.joinedAt`) y la distribución de canales actual, asegurando gráficos poblados y de alto valor desde el primer instante.
5. **Dashboard Visual Interactivo:** Integración en el Web Dashboard (`ServerStatsTab.jsx`) con selector de rango (7d, 14d, 30d), tarjetas KPI, gráficos SVG interactivos y tooltips descriptivos, con soporte trilingüe total (`es-419`, `en-US`, `de`).

---

## 2. Modelo de Datos y Esquemas Zod

### 2.1 Esquemas de Validación (`src/utils/schemas.js`)

```javascript
export const DailyAnalyticsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // 'YYYY-MM-DD'
  joins: z.number().int().nonnegative().default(0),
  leaves: z.number().int().nonnegative().default(0),
  net: z.number().int().default(0),
  totalMembers: z.number().int().nonnegative().default(0),
  messages: z.number().int().nonnegative().default(0),
  activeUsers: z.number().int().nonnegative().default(0),
  channels: z.record(z.string(), z.number().int().nonnegative()).default({}),
});

export const ActivityHeatmapSchema = z.object({
  matrix: z.array(z.array(z.number().int().nonnegative()).length(24)).length(7), // 7 días x 24 horas
  totalMessages: z.number().int().nonnegative().default(0),
  lastUpdated: z.string(),
});

export const InsightsOverviewSchema = z.object({
  guildId: z.string(),
  totalMembers: z.number().int().nonnegative(),
  growth7d: z.number().int(),
  growth30d: z.number().int(),
  messagesToday: z.number().int().nonnegative(),
  messages7d: z.number().int().nonnegative(),
  peakHour: z.number().int().min(0).max(23),
  peakDay: z.number().int().min(0).max(6),
  topChannels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    count: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
  })),
  history: z.array(DailyAnalyticsSchema),
  heatmap: ActivityHeatmapSchema,
});
```

### 2.2 Claves Canónicas en PostgreSQL (`src/utils/database/keys.js`)

- `getDailyAnalyticsKey(guildId, dateString)`: `guild:${guildId}:analytics:daily:${dateString}`
- `getAnalyticsHeatmapKey(guildId)`: `guild:${guildId}:analytics:heatmap`
- `getAnalyticsIndexKey(guildId)`: `guild:${guildId}:analytics:index`

---

## 3. Servicio Central de Analíticas (`analyticsService.js`)

Ubicación: `src/services/analytics/analyticsService.js`

### 3.1 Ingestión de Eventos en Tiempo Real
- `recordMemberJoin(guild, member)`: Registra la unión en el registro diario actual (`YYYY-MM-DD`), actualiza `joins += 1`, `net += 1` y almacena `totalMembers`.
- `recordMemberLeave(guild, member)`: Registra la salida en el registro diario, actualiza `leaves += 1`, `net -= 1` y almacena `totalMembers`.
- `recordMessageActivity(guild, channel, author)`:
  - Incrementa contador diario de mensajes.
  - Incrementa contador por canal `channels[channel.id] += 1`.
  - Actualiza celda en la matriz de calor `heatmap[dayOfWeek][hour] += 1`.
  - Registra usuario activo mediante set temporal en memoria.

### 3.2 Generación de Baseline Histórico
Para evitar "gráficas vacías" en servidores recién instalados:
- Si el servidor tiene menos de 7 días de registros analíticos guardados, `getGrowthAnalytics(guild, days)` analiza las propiedades de `guild.members.cache` (ordenando por `joinedTimestamp`) para reconstruir el historial de uniones de los últimos 30 días, combinándolo transparentemente con la actividad registrada.

---

## 4. Endpoints de la API REST (`insightsController.js`)

Rutas montadas en `src/api/routes/guildRoutes.js`:

1. `GET /api/guilds/:guildId/insights/overview?range=30`
   - Retorna KPIs principales, porcentaje de cambio, canal más activo, hora pico y lista resumida.
2. `GET /api/guilds/:guildId/insights/growth?range=30`
   - Retorna serie temporal de miembros: `{ date, joins, leaves, net, totalMembers }[]`.
3. `GET /api/guilds/:guildId/insights/heatmap`
   - Retorna la matriz de calor 7x24 con intensidades relativas (`0.0` a `1.0`) para fácil renderizado.
4. `GET /api/guilds/:guildId/insights/channels`
   - Retorna la distribución de mensajes por canal con nombres, menciones y porcentajes.

---

## 5. Diseño del Web Dashboard (`ServerStatsTab.jsx`)

Se enriquece `ServerStatsTab.jsx` dividiéndola en dos sub-pestañas ergonómicas:
1. **Pestaña 1: Analíticas y Crecimiento (Insights)** (`insights`):
   - **Fila Superior de KPIs:**
     - Total Miembros (con tendencia y variación porcentual).
     - Uniones y Salidas netas (con desglose visual de ingresos vs egresos).
     - Mensajes totales del período.
     - Momento de Máxima Concurrencia (Día y Hora pico).
   - **Selector de Período:** Botones para `7 días`, `14 días` y `30 días`.
   - **Gráfica de Crecimiento Temporal:** Visualización de barras compuestas con uniones (verde esmeralda), salidas (rojo rubí) y curva de balance neto.
   - **Mapa de Calor Semanal 7x24 (Heatmap):** Grilla interactiva con celdas coloreadas en gradiente `#5865F2` según la densidad de chat y tooltips dinámicos con hora, día y cantidad de mensajes.
   - **Top Canales de Texto:** Barras de progreso con volumen y porcentaje de participación comunitaria.
2. **Pestaña 2: Contadores en Canales de Voz** (`counters`):
   - Mantiene intacta la configuración existente de canales de voz con contadores numéricos dinámicos (`Total Members: X`, `Bots: Y`).

---

## 6. Paridad Trilingüe de Internacionalización (i18n)

Se añadirán todas las claves bajo el namespace `insights.*` con 100% de paridad en:
- `dashboard/src/locales/es-419.json`
- `dashboard/src/locales/en-US.json`
- `dashboard/src/locales/de.json`
