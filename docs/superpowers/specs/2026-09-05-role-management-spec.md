# Especificación Técnica: Módulo de Gestión de Roles & Reaction Roles (Capa 2)

- **Fecha:** 2026-09-05
- **Estado:** Propuesto (Capa 2 del Roadmap de Madurez Arquitectónica)
- **Autor:** Antigravity / TitanBot Team

---

## 1. Contexto y Motivación

Actualmente, TitanBot cuenta con un sistema robusto de **Roles por Reacción** en el backend ([`src/services/reactionRoleService.js`](file:///c:/Users/Laptop-150/jorge/TitanBot/src/services/reactionRoleService.js) y [`src/commands/Reaction_roles/reactroles.js`](file:///c:/Users/Laptop-150/jorge/TitanBot/src/commands/Reaction_roles/reactroles.js)). Sin embargo:
1. Su configuración requiere ejecutar el comando `/reactroles setup` en Discord, el cual es rígido, no permite previsualizar el resultado y limita la cantidad de roles a los parámetros del slash command.
2. Los administradores no tienen una vista centralizada en la web para consultar cuántos paneles de roles existen, en qué canales están publicados ni editarlos/eliminarlos fácilmente.

El objetivo de la **Capa 2** es proporcionar una interfaz visual en el Web Dashboard para diseñar, previsualizar y gestionar paneles de auto-asignación de roles en tiempo real, respetando estrictamente la jerarquía de roles de Discord.

---

## 2. Arquitectura y Modelo de Datos

### 2.1 Almacenamiento en Base de Datos
El bot ya almacena los paneles de Reaction Roles en PostgreSQL mediante claves estructuradas generadas por `getReactionRoleKey(guildId, messageId)`.

**Estructura del Registro:**
```json
{
  "guildId": "123456789012345678",
  "channelId": "987654321098765432",
  "messageId": "112233445566778899",
  "title": "Elige tus Roles de Notificaciones",
  "description": "Haz clic en los botones para obtener o remover los roles correspondientes.",
  "type": "buttons",
  "color": "#5865F2",
  "roles": [
    {
      "roleId": "556677889900112233",
      "label": "Anuncios",
      "emoji": "📢",
      "style": "Primary"
    },
    {
      "roleId": "667788990011223344",
      "label": "Eventos",
      "emoji": "🎉",
      "style": "Success"
    }
  ],
  "createdAt": "2026-09-05T10:00:00.000Z"
}
```

### 2.2 Reutilización de Servicios
No crearemos lógica duplicada. La API REST invocará directamente las funciones existentes de `reactionRoleService.js`:
- `createReactionRoleMessage(client, guildId, channelId, config)`
- `getAllReactionRoleMessages(client, guildId)`
- `deleteReactionRoleMessage(client, guildId, messageId)`

---

## 3. Especificación de la API REST

### 3.1 Endpoints de Reaction Roles (`/api/guilds/:guildId/reactroles`)

| Método | Ruta | Descripción | Seguridad |
|---|---|---|---|
| `GET` | `/api/guilds/:guildId/reactroles` | Lista todos los paneles activos del servidor con metadatos del canal y conteo de roles. | Requiere Permisos en Servidor |
| `POST` | `/api/guilds/:guildId/reactroles` | Envía el panel a Discord, lo registra en PostgreSQL y devuelve el objeto creado con su `messageId`. | Requiere Permisos + Validación de Jerarquía |
| `DELETE` | `/api/guilds/:guildId/reactroles/:messageId` | Elimina el mensaje de Discord (si aún existe) y purga el registro de la base de datos. | Requiere Permisos en Servidor |

### 3.2 Validación de Seguridad y Jerarquía en Backend
En la petición `POST /api/guilds/:guildId/reactroles`:
1. **Permiso de Gestionar Roles:** Comprobar que el bot tenga `PermissionFlagsBits.ManageRoles` en el servidor.
2. **Jerarquía:** Para cada rol incluido en la lista `roles`, verificar que `role.position < botMember.roles.highest.position`. Si algún rol es inalcanzable, la API responderá con `422 Unprocessable Entity` detallando qué rol causa el conflicto.
3. **Permisos en Canal:** Verificar que el bot tenga permisos de `ViewChannel` y `SendMessages` en el canal destino.

---

## 4. Especificación de la Interfaz de Usuario (Frontend)

### 4.1 Navegación
- **Nueva Pestaña en Sidebar:** `Reaction Roles` (icono `KeyRound` o `ShieldCheck`), ruta `/manage/:guildId/roles`.

### 4.2 Componentes de la Vista
1. **Sección: Paneles Activos:**
   - Tarjetas responsivas mostrando cada panel existente con:
     - Nombre del canal (`#canal`).
     - Título y vista previa del mensaje.
     - Badges con los roles configurados.
     - Botón de enlace directo a Discord (`https://discord.com/channels/{guildId}/{channelId}/{messageId}`).
     - Botón de eliminación con confirmación modal.
2. **Sección: Creador Visual de Paneles (Constructor):**
   - **Selector de Canal:** Dropdown de canales de texto (`channels`).
   - **Campos de Texto:** Título, Descripción y Color del Embed.
   - **Tipo de Interfaz:** Toggle para elegir entre `Botones de Acción` o `Menú Desplegable (Select Menu)`.
   - **Constructor de Opciones de Rol:**
     - Botón "+ Agregar Rol" (hasta 25 opciones).
     - Cada fila permite elegir el rol (usando `RoleSelect` con `warnHierarchy={true}`), definir una etiqueta personalizada y un emoji opcional.
3. **Previsualizador en Tiempo Real (Live Discord Preview):**
   - Componente lateral idéntico al de bienvenida que renderiza en tiempo real el Embed de Discord y los botones o menú desplegable con el estilo y colores seleccionados.

---

## 5. Plan de Pruebas y Verificación

1. **Backend Tests:**
   - Pruebas unitarias para `GET /api/guilds/:guildId/reactroles`.
   - Pruebas unitarias para `POST /api/guilds/:guildId/reactroles` validando el rechazo si se intenta publicar un rol superior al bot.
   - Pruebas unitarias para `DELETE /api/guilds/:guildId/reactroles/:messageId`.
2. **Frontend Tests & Build:**
   - `npm run build:dashboard` con 0 errores.
   - Verificación de renderizado de roles con warning preventivo.
3. **Despliegue:**
   - Reconstrucción del contenedor en VPS y prueba interactiva en Discord.
