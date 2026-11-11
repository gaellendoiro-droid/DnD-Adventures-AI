# Normas de Trabajo

Reglas para mantener el proyecto estable mientras crece (TASK-070). Aplican a cualquier persona o agente de IA que modifique el código.

---

## 🌿 Ramas, commits y merges

- **No se hacen commits directamente en `main`.** Cada tarea va en su propia rama (`feat/…`, `fix/…`, `chore/…`, `docs/…`).
- **Integración sin PR (proyecto de un solo desarrollador):** cuando la tarea está terminada y pasa las comprobaciones locales, la rama se integra en `main` con `git merge --no-ff` y se hace push. No hace falta abrir un pull request.
- **Una tarea por rama.** Si una tarea tiene un ID `[TASK-XXX]`, se cita en la rama o en el commit.
- **Commits pequeños y temáticos**, con mensajes en español al estilo *Conventional Commits* (`feat(ai): …`, `fix(core): …`, `docs: …`).
- **No se acumula trabajo sin commitear.** Al terminar una sesión, el trabajo queda commiteado en su rama, aunque esté a medias.
- **Un solo agente modifica el proyecto.** Si en algún momento trabajan varios, cada uno tiene asignada una zona de ficheros distinta y nunca editan los mismos ficheros a la vez.

## ✅ Calidad mínima para hacer merge

- **Antes del merge, en local, tiene que pasar todo lo que ejecuta la CI:** `npx tsc --noEmit`, `npx vitest run --maxWorkers=4` y `npm run test:scenarios`.
- **Después del push, la CI de `main` tiene que quedar en verde** (`.github/workflows/ci.yml`). Si sale en rojo, arreglarlo es lo primero que se hace, antes de seguir con cualquier otra tarea.
- **El build es estricto con TypeScript:** un error de tipos bloquea `next build`. No se vuelve a activar `ignoreBuildErrors`.
- **Cada corrección de un bug lleva su test de regresión**, salvo que sea imposible y se explique en el commit.
- **Nada de lógica específica de una aventura en el código.** Nombres propios, conjuros concretos o spoilers van en el JSON de la aventura (por ejemplo `roleplay.hiddenIdentityTerms`).
- **Las reglas del juego van en código, no en prompts.** Si una norma del prompt ("PROHIBIDO…") se puede comprobar en TypeScript, se mueve a la Capa 2 con su test.

## 📚 Documentación

- **La documentación se actualiza en el mismo commit que el código** que la deja desfasada (README, `docs/`, `env.example`).
- **Los cambios se registran en `CHANGELOG.md`**, sección `[Unreleased]`, de forma aditiva.
- **El avance de la hoja de ruta se marca en `docs/roadmap.md`** al completar cada tarea.

## 🗃️ Ficheros con tratamiento especial

- **`knowledge/dnd-local.db`:** base de datos SQLite que hace de semilla y de caché del compendio (monstruos, conjuros y objetos). Está versionada para que el proyecto funcione al clonarlo, pero la app y los tests la modifican al usarse. **No se commitean esos cambios incidentales**; solo se commitea cuando se actualiza la semilla a propósito (por ejemplo con `scripts/seed-db.ts`).
- **`.env`:** nunca se versiona. Las variables disponibles están documentadas en `env.example`.
