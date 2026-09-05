# Especificación Técnica Integral: Cobertura 100% del Web Dashboard de TitanBot

- **Fecha:** 2026-09-05
- **Estado:** Propuesto (Para aprobación del usuario)
- **Objetivo:** Definir la arquitectura, diseño de interfaces, endpoints de API y esquemas de datos para los 6 módulos restantes necesarios para que el Web Dashboard cubra el 100% de las funcionalidades de TitanBot (100 comandos en 19 dominios).

---

## 1. Mapa de Capacidades Restantes (Capability Map)

| ID del Módulo | Nombre | Responsabilidad | Dependencias | Prioridad |
| :--- | :--- | :--- | :--- | :--- |
| `moderation` | **Moderación y Sanciones** | Historial de sanciones del servidor, búsqueda de miembros, gestión de advertencias (`warns`), notas de staff (`usernotes`) y reglas de castigo automático (`auto-punish`). | Núcleo Auth, Roles | **Prioridad 1 (Opción A)** |
| `giveaways` | **Gestor de Sorteos** | Creador visual de sorteos (premios, duración, requisitos de rol), lista de sorteos activos con temporizador, finalización y re-sorteo (`reroll`). | Discord Channels, Roles | **Prioridad 2** |
| `birthdays` | **Sistema de Cumpleaños** | Configuración de canal y mensaje de felicitaciones automáticas, rol de cumpleañero temporal y calendario de próximos cumpleaños. | Discord Channels, Roles | **Prioridad 3** |
| `community` | **Postulaciones y Sugerencias** | Constructor de preguntas para postulaciones a staff, bandeja de revisión de candidatos (aprobar/rechazar) y buzón de sugerencias de la comunidad. | Discord Channels, Logging | **Prioridad 4** |
| `tools-embeds`| **Creador de Embeds (WYSIWYG)** | Constructor visual de anuncios y mensajes embed de Discord con selector de colores, campos dinámicos y publicación directa en canales. | Discord Channels | **Prioridad 5** |
| `music-player`| **Reproductor de Música Web** | Visualizador de cola de reproducción en tiempo real Lavalink/Riffy, estado del reproductor y controles de audio (pausa, saltar pista, volumen). | Lavalink / Voice States | **Prioridad 6** |

---

## 2. Especificación Detallada por Módulo

### Módulo 1: Moderación y Sanciones (`moderation`) — *Prioridad Seleccionada*

#### 1.1 Objetivos y Casos de Uso
- Permitir a los moderadores y administradores auditar todas las sanciones del servidor desde una interfaz gráfica limpia y rápida.
- Buscar miembros por nombre o ID para inspeccionar sus advertencias activas y notas internas de moderador.
- Revocar o eliminar advertencias (`removeWarning`, `clearWarnings`) sin necesidad de recordar IDs de advertencia en Discord.
- Configurar reglas de **Castigo Automático por Acumulación de Warns** (ejemplo: 3 advertencias = Timeout de 1 hora; 5 advertencias = Kick; 7 advertencias = Ban).

#### 1.2 Endpoints de API REST
- `GET /api/guilds/:guildId/moderation/cases`
  - Parámetros query: `?limit=50&userId=&moderatorId=`
  - Retorna: Lista de casos de advertencias ordenados cronológicamente con información de usuario, moderador, motivo y fecha.
- `GET /api/guilds/:guildId/moderation/users/:userId`
  - Retorna: Objeto con `{ user, warnings, notes, isBanned, isTimedOut }`.
- `DELETE /api/guilds/:guildId/moderation/warnings/:userId/:warningId`
  - Elimina una advertencia individual llamando a `WarningService.removeWarning`.
- `DELETE /api/guilds/:guildId/moderation/warnings/:userId`
  - Limpia todas las advertencias del usuario llamando a `WarningService.clearWarnings`.
- `GET /api/guilds/:guildId/moderation/config` & `PATCH /api/guilds/:guildId/moderation/config`
  - Configura el sistema de castigos automáticos (`autoPunish`: array de `{ warnThreshold: number, action: 'timeout'|'kick'|'ban', durationMs?: number }`).

#### 1.3 Validación de Seguridad y Jerarquía
- Comprobación estricta de permisos: Solo usuarios con permiso `BanMembers`, `KickMembers` o `ModerateMembers`.
- Jerarquía de roles: No se permite aplicar sanciones desde la web sobre usuarios con roles superiores al moderador o superiores a TitanBot (`422 HierarchyError`).

---

### Módulo 2: Gestor de Sorteos (`giveaways`)

#### 2.1 Objetivos y Casos de Uso
- Crear sorteos interactivos en Discord sin comandos de texto engorrosos.
- Definir premios, tiempo de duración (ej. `24h`, `3d`), canal de publicación, cantidad de ganadores y roles requeridos para participar.
- Visualizar sorteos actualmente en curso con contador en vivo de tiempo restante y número de participantes.
- Forzar la finalización de un sorteo o ejecutar un re-sorteo (`reroll`) con un solo clic.

#### 2.2 Endpoints de API REST
- `GET /api/guilds/:guildId/giveaways`: Retorna sorteos activos y sorteos finalizados recientemente.
- `POST /api/guilds/:guildId/giveaways`: Crea un nuevo sorteo publicando el embed en el canal seleccionado y registrándolo en PostgreSQL.
- `POST /api/guilds/:guildId/giveaways/:giveawayId/end`: Finaliza el sorteo y selecciona ganadores.
- `POST /api/guilds/:guildId/giveaways/:giveawayId/reroll`: Vuelve a sortear ganadores para un sorteo concluido.

---

### Módulo 3: Sistema de Cumpleaños (`birthdays`)

#### 3.1 Objetivos y Casos de Uso
- Configurar el canal dedicado para los anuncios automáticos de cumpleaños (`birthdayChannelId`).
- Mensaje personalizado con placeholders `{user}`, `{age}`, `{server}`.
- Calendario visual interactivo ordenado por meses (Enero a Diciembre) mostrando qué miembros cumplen años.
- Opción de asignar un rol temporal de felicitación durante 24 horas.

#### 3.2 Endpoints de API REST
- `GET /api/guilds/:guildId/birthdays`: Retorna configuración de cumpleaños y lista completa de cumpleaños registrados en el servidor.
- `PATCH /api/guilds/:guildId/birthdays/config`: Actualiza el canal de anuncio, mensaje y rol temporal.
- `DELETE /api/guilds/:guildId/birthdays/:userId`: Permite a un administrador eliminar un registro erróneo.

---

### Módulo 4: Postulaciones y Sugerencias de la Comunidad (`community`)

#### 4.1 Objetivos y Casos de Uso
- Diseñar cuestionarios de postulación para roles de moderación o soporte (preguntas personalizadas tipo texto corto o largo).
- Panel de postulaciones recibidas: Ver respuestas de los candidatos, fecha de envío, y botones para Aprobar (otorgando el rol automáticamente) o Rechazar.
- Buzón de sugerencias: Lista de sugerencias enviadas por usuarios con filtros de estado (Pendiente, Aprobada, Rechazada, Implementada).

#### 4.2 Endpoints de API REST
- `GET /api/guilds/:guildId/applications`: Ajustes de postulación y lista de candidatos pendientes.
- `PATCH /api/guilds/:guildId/applications/config`: Configuración de preguntas, rol postulado y canal de logs.
- `PATCH /api/guilds/:guildId/applications/:appId`: Cambia estado (`approved` o `rejected`) y notifica al usuario.
- `GET /api/guilds/:guildId/suggestions`: Lista de sugerencias recibidas con posibilidad de moderarlas.

---

### Módulo 5: Creador de Embeds WYSIWYG (`tools-embeds`)

#### 5.1 Objetivos y Casos de Uso
- Permitir a los administradores componer anuncios profesionales con formato Embed rico sin depender de sitios externos.
- Controles de color (hex picker), autor, título, descripción en markdown, hasta 25 campos (con toggle inline), imagen grande, thumbnail y pie de página.
- Previsualizador en tiempo real idéntico al render de Discord.
- Selector de canal de destino y botón "Publicar Anuncio".

#### 5.2 Endpoints de API REST
- `POST /api/guilds/:guildId/embeds/send`: Envía el embed al canal seleccionado, validando permisos del bot en el canal (`SendMessages`, `EmbedLinks`).

---

### Módulo 6: Reproductor de Música Web (`music-player`)

#### 6.1 Objetivos y Casos de Uso
- Ver qué pista se está reproduciendo actualmente en el servidor (`title`, `author`, `duration`, `thumbnail`, barra de progreso).
- Ver la cola de canciones en espera (`queue`).
- Controles web básicos de reproducción: Pausar, Reanudar, Saltar pista (`Skip`), Detener (`Stop`).

#### 6.2 Endpoints de API REST
- `GET /api/guilds/:guildId/music/status`: Estado actual del nodo Lavalink, reproductor del gremio, pista actual y cola.
- `POST /api/guilds/:guildId/music/action`: Acciones de control (`pause`, `resume`, `skip`, `stop`).

---

## 3. Estrategia de Entrega y Calidad

1. **Rigor de Pruebas Automatizadas:** Cada módulo se desarrollará con cobertura en `tests/unit/api-routes.test.js` garantizando el 100% de tests passing antes de cualquier despliegue.
2. **Internacionalización Total (i18n):** Cada módulo nuevo incluirá catálogos completos en `es-419`, `en-US` y `de`.
3. **Flujo Git Controlado:** Trabajo en rama feature (`feat/moderation-dashboard`, etc.), pruebas locales, compilación de Vite, despliegue a VPS staging y posterior merge a `custom`.
