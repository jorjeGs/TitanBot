# TitanBot — Especificación de Diseño Técnico: Subsistema i18n & POC /help

**Fecha:** 2026-09-04  
**Estado:** Aprobado para Implementación  
**Rama base:** `custom`  
**Rama de trabajo:** `feat/i18n`  
**Repositorio Principal:** `jorjeGs/TitanBot` (Fork de `codebymitch/TitanBot`)

---

## 1. Contexto y Objetivos

TitanBot actualmente contiene cadenas de texto en inglés hardcodeadas en comandos, embeds, botones y controladores de error. El objetivo de este subsistema es dotar al bot de una arquitectura de internacionalización (**i18n**) completa, mantenible y extensible, comenzando con soporte para:

* **`en-US`**: Inglés (Estados Unidos) — **Fallback global obligatorio**.
* **`es-419`**: Español (Latinoamérica).
* **`de`**: Deutsch (Alemán).

### Objetivos Clave
1. **Separación real entre lógica y presentación**: Ningún texto de interfaz de usuario hardcodeado en la lógica de negocio.
2. **Compatibilidad nativa con Application Commands de Discord**: Localización de nombres y descripciones en la API de Discord sin aumentar el límite global de comandos ($\le 100$).
3. **Resolución contextual dual**:
   * *Respuestas de usuario*: Prioriza locale de interacción (`interaction.locale`) salvo que el servidor fuerce un idioma.
   * *Mensajes del servidor*: Prioriza idioma del servidor (`guildConfig.locale`) o `guild.preferredLocale`.
4. **Resiliencia y Fallback seguro**: Si una clave falta en cualquier idioma, se muestra automáticamente el texto de `en-US`. El usuario nunca recibe una clave cruda como `core.help.title`.
5. **Preservación de compatibilidad con Upstream**: Estructura modular sin cambios destructivos en el núcleo para facilitar futuros `git merge upstream/main`.
6. **Validación POC**: Prueba de concepto completa en el comando `/help`.

---

## 2. Estrategia de Ramas Git

El flujo de trabajo en Git aísla completamente los cambios de la variante respecto al upstream original:

```text
upstream/main (codebymitch/TitanBot)
     ↓ [merge periódico]
main (jorjeGs/TitanBot - espejo limpio de upstream)
     ↓
custom (rama base de nuestra personalización)
     ↓
feat/i18n (rama de desarrollo de esta especificación)
```

* **`main`**: Espejo 1:1 de `upstream`. Sin commits locales.
* **`custom`**: Rama raíz de nuestra variante de producción.
* **`feat/i18n`**: Rama de trabajo donde se implementa el core i18n, catálogos y el POC de `/help`. Se integra mediante Pull Request hacia `custom`.

---

## 3. Arquitectura del Subsistema i18n

### 3.1 Estructura de Directorios

```text
src/
├── locales/                               # Catálogos JSON estructurados por idioma y dominio
│   ├── en-US/                             # Fallback global
│   │   ├── common.json                    # Mensajes genéricos, botones de sistema, errores globales
│   │   ├── commands.json                  # Nombres y descripciones nativas de slash commands
│   │   └── core.json                      # Textos específicos de /help, /configwizard, /commands
│   ├── es-419/                            # Español latinoamericano
│   │   ├── common.json
│   │   ├── commands.json
│   │   └── core.json
│   └── de/                                # Alemán
│       ├── common.json
│       ├── commands.json
│       └── core.json
│
└── utils/
    └── i18n/                              # Motor central de internacionalización
        ├── index.js                       # Fachada pública (t, resolveLocale, normalizeLocale, etc.)
        ├── loader.js                      # Carga síncrona/cache de catálogos en memoria
        ├── resolver.js                    # Lógica de decisión contextual (guild vs interaction)
        ├── interpolator.js                # Sustitución segura de variables {variable}
        └── commandLocalizer.js            # Inyector de setNameLocalizations en SlashCommandBuilders
```

### 3.2 Módulos y Responsabilidades

1. **`loader.js`**:
   * Carga síncronamente al iniciar el bot todos los archivos `.json` de `src/locales/` y los almacena en un árbol en memoria `catalogs[locale][domain][key]`.
   * Realiza validación preliminar comprobando que `en-US` contenga todas las claves requeridas.

2. **`interpolator.js`**:
   * Toma una plantilla de texto (ej. `"Bienvenido {user} a {server}!"`) y un objeto de variables `{ user: "Alex", server: "TitanHub" }`.
   * Reemplaza las variables coincidentes mediante expresión regular segura sin evaluar código externo ni romper si alguna variable es `null` o `undefined`.

3. **`resolver.js`**:
   * Implementa `normalizeLocale(locale)`:
     * `es-*` $\rightarrow$ `es-419`
     * `en-*` $\rightarrow$ `en-US`
     * `de-*` $\rightarrow$ `de`
     * No soportados $\rightarrow$ `en-US`
   * Implementa `resolveLocale(context)`:
     * Para interacciones de usuario: Evalúa `guildConfig.locale`. Si es distinto de `'auto'`, usa `guildConfig.locale`. De lo contrario usa `normalizeLocale(interaction.locale)`.
     * Para eventos de servidor: Evalúa `guildConfig.locale`. Si es distinto de `'auto'`, usa `guildConfig.locale`. De lo contrario usa `normalizeLocale(guild.preferredLocale)`.

4. **`commandLocalizer.js`**:
   * Toma un `SlashCommandBuilder` (o `SlashCommandSubcommandBuilder`) y la clave del comando.
   * Extrae `commands.json` de cada idioma registrado y aplica `.setNameLocalizations()` y `.setDescriptionLocalizations()`.
   * Asegura que los nombres cumplan con la regex de Discord `^[a-z0-9_-]{1,32}$`.

5. **`index.js` (Fachada `t`)**:
   * Firma: `t(key, variables = {}, target = null)`
   * Parsea la clave `domain.section.item` (ej. `core.help.title`).
   * Resuelve el locale a partir de `target` (puede ser un objeto `Interaction`, un `Guild`, un `guildId`, o un string de locale explícito).
   * Obtiene la traducción del locale correspondiente; si no existe, recurre a `en-US`.
   * Pasa la cadena resultante por `interpolator.js`.

---

## 4. Persistencia y Configuración por Servidor (PostgreSQL)

### 4.1 Modificaciones en el Esquema de Configuración
* **`src/config/guild/guildConfigDefaults.js`**:
  ```javascript
  export const GUILD_CONFIG_DEFAULTS = {
      ...DEFAULT_GUILD_CONFIG,
      locale: 'auto', // 'auto' | 'en-US' | 'es-419' | 'de'
      // ...demás propiedades
  };
  ```
* **`src/utils/schemas.js`**:
  * Validación de que `guildConfig.locale` pertenezca a `SUPPORTED_CONFIG_LOCALES = ['auto', 'en-US', 'es-419', 'de']`.

### 4.2 Métodos en `guildConfigService` (`src/services/config/guildConfig.js`)
* `getGuildLocale(client, guildId)`: Retorna el locale del servidor o `'auto'`.
* `setGuildLocale(client, guildId, locale)`: Persiste el locale validado en PostgreSQL mediante el wrapper existente `updateGuildConfig`.

### 4.3 Interfaces de Usuario para Configuración
1. **Comando dedicado `/language`** (`src/commands/Core/language.js`):
   * `/language view`: Muestra el idioma configurado en el servidor y el idioma resuelto del usuario.
   * `/language set [auto | en-US | es-419 | de]`: Requiere permisos `ManageGuild` y actualiza la configuración.
2. **Dashboard interactivo `/configwizard`** (`src/commands/Core/configWizard.js`):
   * Añadir el selector interactivo `"Language / Idioma"` para ajustar el locale directamente desde los componentes del dashboard.

---

## 5. Prueba de Concepto (POC): Comando `/help`

El comando `/help` (`src/commands/Core/help.js`) se localiza por completo:

1. **Definición del Comando**:
   * Canonical: `help`
   * Name localizations: `{ 'es-419': 'ayuda', 'de': 'hilfe' }`
   * Description localizations: `{ 'es-419': 'Muestra el menú de ayuda e información de comandos.', 'de': 'Zeigt das Hilfemenü und Befehlsinformationen an.' }`
2. **Embed Principal (`createInitialHelpMenu`)**:
   * Título, descripción y footer obtenidos mediante `t('core.help.embed.title', ...)`.
   * Nombres de categorías dinámicos (`core.help.categories.*`).
3. **Componentes Interactivos**:
   * Select Menu con nombres y descripciones de categorías localizados.
   * Botones de enlaces (Soporte, Invitar, Docs) con etiquetas traducidas (`core.help.buttons.*`).
4. **Vistas de Categoría**:
   * Embed de comandos de cada categoría generado dinámicamente con títulos y descripciones traducidas.

---

## 6. Plan de Verificación y Criterios de Aceptación

### 6.1 Pruebas Automatizadas Unitarias
* **Normalización**:
  * `normalizeLocale('es-419')` $\rightarrow$ `'es-419'`
  * `normalizeLocale('es-ES')` $\rightarrow$ `'es-419'`
  * `normalizeLocale('en-GB')` $\rightarrow$ `'en-US'`
  * `normalizeLocale('de')` $\rightarrow$ `'de'`
  * `normalizeLocale('ja')` $\rightarrow$ `'en-US'`
* **Fallback seguro**:
  * Consulta de clave inexistente en `es-419` devuelve el valor de `en-US`.
* **Interpolación**:
  * Sustitución correcta de variables `{user}`, `{server}`.
* **Comandos globales**:
  * Verificación de que el número total de comandos registrados en Discord se mantiene inalterado ($\le 100$).

### 6.2 Verificación en Entorno Local y Servidor (`compucita`)
* `GET /health` responde HTTP 200 con estado de base de datos saludable.
* `GET /ready` confirma Discord conectado y base de datos no degradada.
* Ejecución del comando `/help` en cliente Discord configurado en español (muestra `/ayuda` y textos en español) y en inglés (muestra `/help` y textos en inglés).
* Ejecución de `/language set de` verifica persistencia en PostgreSQL.
