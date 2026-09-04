# TitanBot — Handoff técnico para Codex

## 1. Objetivo del proyecto

Estamos partiendo del proyecto open source **TitanBot** para construir y mantener nuestra propia variante orientada a comunidades de streamers internacionales.

Repositorio upstream:

```text
https://github.com/codebymitch/TitanBot
```

Fork que debe considerarse como nuestro repositorio principal:

```text
https://github.com/jorjeGs/TitanBot
```

La idea es dejar de editar código directamente en el servidor y trabajar con un flujo normal de desarrollo:

```text
Laptop / Codex
    ↓
jorjeGs/TitanBot
    ↓
branches + commits + PRs
    ↓
main
    ↓
deploy
    ↓
Oracle Cloud VPS
```

El servidor actual es de **pruebas**, por lo que Codex puede conectarse, inspeccionar servicios, modificar configuración, reconstruir contenedores, reiniciar servicios, etc. No hay datos críticos en producción todavía.

---

# 2. Prioridad inmediata: internacionalización completa (i18n)

TitanBot actualmente contiene gran parte de sus textos hardcodeados en inglés.

Queremos convertirlo en un bot internacional y mantenible.

## Idiomas iniciales

Implementar inicialmente:

```text
en-US   English
es-419  Español latinoamericano
de      Deutsch
```

El idioma fallback global debe ser:

```text
en-US
```

No queremos una traducción "solo al español".

La arquitectura debe permitir agregar fácilmente después:

```text
es-ES
pt-BR
fr
it
nl
pl
...
```

sin tener que modificar la lógica central del bot.

---

# 3. Comportamiento esperado del sistema i18n

Hay dos tipos de mensajes y deben resolverse de forma distinta.

## 3.1 Respuestas iniciadas por un usuario

Ejemplos:

- slash commands
- botones
- selects
- modals
- dashboards interactivos
- errores de interacción
- respuestas de comandos

Resolución deseada:

```text
¿El servidor fuerza un idioma?
        │
   Sí ──┴── No
   │          │
   ▼          ▼
guild       interaction.locale
locale
   │          │
   └────┬─────┘
        ▼
¿locale soportado?
        │
   Sí ──┴── No
   │          │
   ▼          ▼
 usarlo     en-US
```

En modo automático debe priorizarse `interaction.locale`.

---

## 3.2 Mensajes automáticos o propios del servidor

Ejemplos:

- welcome messages
- giveaways
- birthdays
- logs
- ticket automation
- verification
- counters
- cron jobs
- mensajes que no pertenecen a una interacción concreta

Resolución deseada:

```text
Idioma configurado del guild
        ↓
guildLocale de Discord
        ↓
en-US
```

---

# 4. Configuración de idioma por servidor

Agregar una configuración persistente por guild.

Conceptualmente:

```text
locale = auto
locale = en-US
locale = es-419
locale = de
```

Preferentemente integrada dentro del sistema actual de configuración de TitanBot o dentro de `/configwizard`.

Puede existir también un comando dedicado como:

```text
/language
```

o equivalente.

## Comportamiento de `auto`

Para respuestas personales:

```text
interaction.locale
```

Para mensajes automáticos:

```text
guildLocale
```

## Comportamiento forzado

Ejemplo:

```text
locale = de
```

Todo el contenido público/automático del servidor debe ser alemán, aunque el administrador tenga Discord configurado en otro idioma.

---

# 5. Localización nativa de Application Commands de Discord

Aprovechar las localizaciones nativas de Discord para:

- command names
- command descriptions
- subcommands
- options
- choices cuando tenga sentido

Ejemplo conceptual:

```js
.setName('help')
.setNameLocalizations({
    'es-419': 'ayuda',
    de: 'hilfe',
})
```

Así, internamente sigue existiendo:

```text
help
```

pero los usuarios podrían ver:

```text
🇺🇸 /help
🇨🇴 /ayuda
🇩🇪 /hilfe
```

según su locale de Discord.

No crear comandos duplicados por idioma.

---

# 6. Arquitectura i18n sugerida

No es obligatorio seguir exactamente esta estructura si Codex encuentra una alternativa mejor, pero debe existir una separación real entre código y traducciones.

Ejemplo:

```text
src/
├── locales/
│   ├── en-US.*
│   ├── es-419.*
│   └── de.*
│
├── utils/
│   └── i18n.*
│
└── commands/
```

El sistema debe incluir como mínimo:

```text
normalizeLocale()
t()
getUserLocale()
getGuildLocale()
```

y fallback seguro hacia `en-US`.

Nunca debería aparecer al usuario una clave sin traducir como:

```text
help.gettingStarted
```

Si falta una traducción en otro idioma, usar automáticamente el texto `en-US`.

---

# 7. Alcance de la migración

TitanBot carga actualmente aproximadamente **99 comandos**.

No hacer una sustitución masiva y frágil de strings.

Primero realizar un **inventario completo** de superficies de texto.

Buscar como mínimo:

- SlashCommandBuilder
- embeds
- buttons
- select menus
- modals
- interaction replies
- error messages
- dashboard UI
- welcome
- moderation
- logging
- tickets
- verification
- economy
- leveling
- giveaways
- birthday
- music
- scheduled jobs
- generated messages
- validation messages
- command descriptions
- subcommand descriptions
- choices
- utility helpers compartidos

Después migrar por áreas/categorías.

Una posible secuencia:

```text
1. i18n core
2. Core
3. Moderation
4. Welcome
5. Tickets
6. Verification
7. Economy
8. Leveling
9. Giveaways
10. Birthday
11. Music
12. resto
```

Mantener fallback en inglés durante toda la migración para que los módulos aún no migrados sigan funcionando.

---

# 8. Primer POC recomendado

Usar `/help` como prueba de concepto.

Objetivo:

```text
/help
/ayuda
/hilfe
```

deben representar el mismo comando interno.

Todo el contenido de su embed debe adaptarse al locale del usuario:

- título
- descripción
- categorías
- botones
- select
- mensajes de cierre
- textos informativos

Después validar el patrón y extenderlo al resto del bot.

---

# 9. Tests requeridos

Agregar tests donde sea razonable.

Como mínimo verificar:

```text
normalizeLocale('es-419') -> es-419
normalizeLocale('es-ES')  -> fallback o mapping decidido
normalizeLocale('de')     -> de
normalizeLocale('ja')     -> en-US
```

También validar:

- fallback de claves faltantes
- interpolación de variables
- locales de usuario
- locales de guild
- modo guild forzado
- modo auto
- localizaciones de comandos
- que los comandos sigan respetando límites de Discord
- que no aumente el número de comandos globales por cada idioma

TitanBot está muy cerca del límite global de comandos de Discord, por lo que **no se deben duplicar comandos por idioma**.

---

# 10. Git y estrategia de fork

Nuestro fork:

```text
origin -> https://github.com/jorjeGs/TitanBot.git
```

Upstream:

```text
upstream -> https://github.com/codebymitch/TitanBot.git
```

En la laptop, configurar:

```bash
git clone https://github.com/jorjeGs/TitanBot.git
cd TitanBot

git remote add upstream https://github.com/codebymitch/TitanBot.git
git remote -v
```

Para i18n:

```bash
git switch -c feat/i18n
```

Desarrollar mediante branches y PRs.

No trabajar directamente sobre `main`.

---

# 11. Compatibilidad con upstream

Queremos seguir pudiendo traer mejoras de TitanBot original.

Evitar cambios innecesariamente invasivos que dificulten merges futuros.

Flujo esperado:

```bash
git fetch upstream
git switch main
git merge upstream/main
```

o rebase/merge equivalente según el workflow que se establezca.

Codex debe tomar en cuenta esta necesidad al diseñar i18n.

---

# 12. Estado actual del servidor de pruebas

Proveedor:

```text
Oracle Cloud Infrastructure
```

Región:

```text
US West (Phoenix)
```

Tipo de instancia:

```text
VM.Standard.A1.Flex
Ampere ARM64 / aarch64
```

Recursos actuales:

```text
2 OCPU
6 GB RAM
~45 GB boot volume usable
```

Sistema:

```text
Canonical Ubuntu 24.04 Minimal aarch64
```

IP pública actual:

```text
129.146.58.119
```

La VM está pensada como entorno de pruebas.

---

# 13. Acceso SSH

En la laptop ya existe una entrada en:

```text
~/.ssh/config
```

con alias:

```text
compucita
```

Por lo tanto, desde la máquina local:

```bash
ssh compucita
```

debe entrar directamente como:

```text
ubuntu@compu-vnic
```

El alias SSH ya encapsula:

- IP
- usuario
- IdentityFile
- IdentitiesOnly

No copiar ni exponer la private key.

Codex puede utilizar:

```bash
ssh compucita
```

para operar el servidor si su entorno tiene acceso al SSH/config local.

Si el entorno de Codex no hereda la configuración SSH del host, pedir al usuario que habilite/acople el acceso en vez de copiar secretos al repositorio.

---

# 14. Estado del software del servidor

Docker Engine está instalado desde el repositorio oficial de Docker.

También están instalados:

```text
docker compose plugin
git
curl
nano
ca-certificates
```

El usuario `ubuntu` puede ejecutar Docker sin `sudo`.

Comprobaciones útiles:

```bash
docker version
docker compose version
docker run --rm hello-world
```

---

# 15. TitanBot actualmente desplegado

Ruta actual:

```text
~/TitanBot
```

Actualmente ese clone fue creado originalmente desde:

```text
codebymitch/TitanBot
```

y todavía puede apuntar al upstream original.

Cuando nuestro fork esté listo para deployment, cambiar el remote del servidor:

```bash
cd ~/TitanBot

git remote set-url origin https://github.com/jorjeGs/TitanBot.git
git remote -v
```

El `.env` actual contiene secretos de Discord y PostgreSQL.

Debe permanecer **solo en el servidor**.

Nunca hacer:

```text
git add .env
```

---

# 16. Docker Compose actual

Actualmente se están ejecutando dos servicios principales:

```text
titanbot
titanbot-db
```

PostgreSQL:

```text
postgres:15-alpine
```

El volumen de PostgreSQL es persistente.

Estado validado:

```text
TitanBot: healthy
PostgreSQL: healthy
```

Comandos:

```bash
cd ~/TitanBot
docker compose ps
```

Logs:

```bash
docker compose logs -f bot
```

Salir del seguimiento de logs:

```text
Ctrl+C
```

Esto no detiene el bot.

---

# 17. Estado funcional actual

El bot:

- inicia correctamente
- conecta con PostgreSQL
- ejecutó/bootstrappeó el schema
- carga aproximadamente 99 comandos
- inicia sesión correctamente en Discord
- registra los slash commands globalmente
- aparece online
- está añadido al servidor de Discord de pruebas
- `/help` funciona

PostgreSQL está operando en modo persistente, no en degraded/in-memory mode.

---

# 18. Lavalink / música

Actualmente TitanBot usa nodos Lavalink públicos según su configuración upstream.

En logs se han visto warnings de algunos nodos públicos:

```text
SSL errors
DNS EAI_AGAIN
nodes disconnected
```

Esto no impide que el resto del bot funcione.

La música puede ser menos estable mientras se dependa de nodos públicos.

Más adelante podemos valorar:

```text
self-host Lavalink
```

en la misma VM.

Con 6 GB de RAM debería ser razonable para pruebas, pero primero observar consumo real.

---

# 19. Dashboard web — estado actual

**No hemos levantado ningún dashboard web independiente en el servidor.**

Importante:

TitanBot upstream parece utilizar el término "dashboard" principalmente para interfaces interactivas dentro de Discord:

- embeds
- buttons
- select menus
- modals

Ejemplos:

```text
commands dashboard
economy dashboard
level dashboard
verification dashboard
logging dashboard
```

No asumir que existe un frontend web tradicional tipo MEE6/Dyno.

El proceso Node sí incluye Express y actualmente expone endpoints básicos:

```text
/
 /health
 /ready
```

en:

```text
port 3000
```

Dentro del VPS pueden probarse con:

```bash
curl http://127.0.0.1:3000/
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
```

Actualmente no hemos configurado:

```text
reverse proxy
Caddy
Nginx
HTTPS
dominio apuntando al VPS
publicación web del puerto 3000
dashboard frontend
```

Si Codex encuentra dentro del proyecto un dashboard web real no detectado todavía, documentar dónde está y qué necesita para desplegarse.

Si no existe, dejar claro que un dashboard web sería una feature nueva.

---

# 20. Networking del servidor

Se creó una VCN en OCI con Internet Connectivity.

La VM está dentro de una **public subnet** y tiene public IPv4.

La base PostgreSQL no debe exponerse públicamente.

No abrir:

```text
5432
```

a Internet.

Si en el futuro se publica una web/dashboard, preferir:

```text
80
443
```

con reverse proxy y HTTPS.

No exponer directamente servicios internos innecesarios.

---

# 21. Health checks actuales

Desde el servidor:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
```

El endpoint `/health` reporta estado general y base de datos.

El endpoint `/ready` debe ser usado para verificar que:

```text
Discord está ready
PostgreSQL no está degraded
```

Estos endpoints pueden utilizarse más adelante para CI/CD.

---

# 22. Deployment manual actual

Una vez que el servidor apunte a nuestro fork:

```bash
ssh compucita
cd ~/TitanBot

git pull origin main

docker compose up -d --build

docker compose ps
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
```

Si algo falla:

```bash
docker compose logs --tail=200 bot
```

---

# 23. Futuro CI/CD

Cuando el fork sea estable, queremos dejar de desplegar manualmente.

Objetivo eventual:

```text
PR
 ↓
CI
 ↓
tests
 ↓
merge a main
 ↓
build
 ↓
deploy a compucita
 ↓
health check
 ↓
success / rollback
```

Opciones a evaluar:

- GitHub Actions
- GitHub Container Registry
- deployment por SSH
- imagen Docker versionada
- releases/tags
- rollback

Ejemplo de versionado posible:

```text
v2.1.0-custom.1
v2.1.0-custom.2
```

o una estrategia equivalente que Codex considere más limpia.

---

# 24. Seguridad

Nunca commitear:

```text
.env
Discord bot token
PostgreSQL password
SSH private keys
API secrets
```

El `.env` debe mantenerse local al servidor.

Para CI/CD futuro utilizar GitHub Secrets u otro mecanismo seguro.

El VPS es de pruebas, pero no hay necesidad de publicar credenciales.

---

# 25. Estado de recursos del VPS

Última comprobación conocida:

```text
Architecture: aarch64

Disk:
~45 GB total usable
~43 GB libres antes del deployment inicial

RAM:
~5.8 GiB detectados
~5.3 GiB disponibles antes de cargar servicios

Swap:
0
```

No se ha configurado swap todavía.

No es necesario hacerlo de inmediato.

Primero observar RAM real con:

```bash
free -h
docker stats
```

y decidir después.

---

# 26. Operaciones útiles para Codex en el servidor

Conectar:

```bash
ssh compucita
```

Ir al proyecto:

```bash
cd ~/TitanBot
```

Estado Git:

```bash
git status
git remote -v
git branch --show-current
git log --oneline -10
```

Estado Docker:

```bash
docker compose ps
```

Logs:

```bash
docker compose logs --tail=200 bot
docker compose logs -f bot
```

Recursos:

```bash
free -h
df -h /
docker stats
```

Health:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/ready
```

Rebuild:

```bash
docker compose up -d --build
```

Reinicio simple:

```bash
docker compose restart bot
```

Detener stack:

```bash
docker compose down
```

Evitar `down -v` salvo que se quiera borrar deliberadamente la base de datos.

---

# 27. Primer trabajo solicitado a Codex

Antes de implementar cambios masivos:

1. Inspeccionar completamente el fork.
2. Confirmar arquitectura actual.
3. Identificar todas las superficies de strings/texto.
4. Identificar cómo se guarda la configuración por guild.
5. Determinar el mejor lugar para persistir `locale`.
6. Diseñar la capa i18n.
7. Crear tests del core i18n.
8. Implementar un POC completo con `/help`.
9. Validar Discord localizations.
10. Documentar patrón de migración.
11. Migrar incrementalmente el resto del bot.
12. Mantener compatibilidad con upstream.
13. Verificar build Docker ARM64.
14. Probar deployment en `compucita`.
15. Ejecutar `/health` y `/ready` después de cada deployment relevante.

---

# 28. Criterios de aceptación del POC i18n

El primer milestone se considera exitoso cuando:

- `/help` sigue funcionando en inglés.
- un usuario con español ve el comando localizado y contenido en español.
- un usuario con alemán ve el comando localizado y contenido en alemán.
- no se crean comandos duplicados.
- el bot sigue registrando <= 100 comandos globales.
- fallback a `en-US` funciona.
- la configuración de guild puede quedar en `auto` o un locale explícito.
- PostgreSQL sigue funcionando.
- Docker health sigue en verde.
- `/health` responde correctamente.
- `/ready` responde correctamente.
- los cambios están versionados en el fork.
- no se editaron secretos ni se commiteó `.env`.

---

# 29. Filosofía de trabajo

Este proyecto ya no debe tratar al VPS como entorno de desarrollo.

Regla general:

```text
Develop locally.
Version in Git.
Deploy to server.
```

El servidor puede usarse libremente para pruebas, inspección, deploy, logs y troubleshooting, pero los cambios de código que queramos conservar deben terminar en:

```text
jorjeGs/TitanBot
```

y no quedarse únicamente modificados con `nano` dentro del VPS.
