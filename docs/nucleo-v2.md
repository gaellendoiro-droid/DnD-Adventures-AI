# Núcleo v2: rediseño del bucle de turno

> **Estado:** propuesta, pendiente de validar con el usuario (2026-11-11).
> **Decisión tomada:** rehacer solo el núcleo del turno, no el proyecto entero.

## 1. Principio rector: el PDF es la verdad

El objetivo es **jugar la aventura original del PDF**, con un DM que siga sus indicaciones.
Todo lo demás se mide contra ese PDF:

```
PDF original  ──(conversor)──▶  JSON de aventura  ──(núcleo)──▶  partida
   verdad                       copia estructurada               lo que ve el jugador
```

- **Por defecto se aplican las reglas oficiales de D&D 5e.** Cuando el PDF establece algo distinto
  para su aventura, eso es una **excepción de la aventura**: va en los datos que genera el conversor
  y prevalece solo dentro de esa aventura (decidido por el usuario el 2026-11-11).
- Si la partida contradice el PDF, es un fallo.
- Si el JSON no recoge algo del PDF, es un fallo del **conversor** y se arregla allí.
- Cada expectativa de un escenario de prueba **cita el pasaje del PDF** que la justifica.

### Primer contraste con el PDF: la escena del pergamino

Leído el PDF de *The Wild Sheep Chase*, la escena que hemos estado probando funciona distinto
de como la implementa el juego, y nuestros propios tests daban por buenas cosas que el PDF no dice:

| Qué dice el PDF ("Baaaa-d News", p. 2) | Qué hace hoy el juego |
|---|---|
| La oveja se acerca al miembro **con más aptitudes mágicas** y le ofrece el pergamino | La narración no lo tiene en cuenta |
| El **sello de cera** indica que es un *Scroll of Speak With Animals (Modified)*; si alguien lo dice en voz alta, la oveja asiente y bala con entusiasmo | Para saber qué es, pide una tirada de Arcanos |
| **Basta con leerlo en voz alta** para activar el conjuro; lo oyen **todos** | Exige una tirada de Arcanos CD 10 a quien no tenga el conjuro en su clase (regla genérica de 5e) |
| Tras confirmar que la entienden, se presenta como **Finethir Shinebright**, un mago que necesita ayuda para recuperar un artefacto de un mago peligroso | Funciona a veces; ha llegado a inventarse "Aldric" o a usar textos de reemplazo |
| Poco después de empezar su historia **se oyen aullidos y llega Guz** con tres lobos y un oso pardo | Guz no aparece nunca (TASK-084) |

El escenario `oveja-02-pergamino` comprueba hoy que leer el pergamino **exige** una tirada de
Arcanos. Eso contradice el PDF, y es justo el tipo de error que este principio debe evitar.

## 2. Por qué rehacer el núcleo

Casi todos los fallos de las pruebas manuales del 2026-11-11 vienen de cuatro problemas de diseño
del bucle actual (`gameStreamCoordinator` → `narrative-turn-manager` → reglas y sistemas →
`narrative-manager` y expertos, unas 6.000 líneas):

1. **Estado y narración desacoplados.** El motor decide algo, pero el narrador lo recibe a trozos
   (`systemFeedback`, directivas montadas con expresiones regulares, fichas JSON enteras) y rellena
   los huecos inventando: "Aldric", "lo saca de las fauces de la oveja", "un antagonista oculto".
2. **Código a medida de una aventura.** `scroll-rules.ts` (600 líneas) solo sirve para el pergamino
   de la oveja, y varios prompts hablan de "la oveja" literalmente.
3. **Expresiones regulares sobre el texto del jugador** para decidir reglas ("coger", "pergamino",
   "descans"…), que fallan con cualquier frase no prevista.
4. **Entre 3 y 14 llamadas a la IA por turno.** Agotan la cuota gratuita en una tarde y cada llamada
   es otra ocasión de contradecirse.

Se conserva todo lo demás: el **conversor**, los esquemas, los dados, el combate, la interfaz, el
contrato de eventos SSE con el cliente y el **banco de escenarios**.

## 3. Diseño del turno

```
 acción del jugador
        │
        ▼
 ① Intérprete (1 llamada IA) ── salida cerrada: tipo de acción + IDs reales
        │
        ▼
 ② Motor de reglas (código, determinista, genérico)
        │   - aplica la acción al estado
        │   - tira los dados que hagan falta
        │   - evalúa los disparadores de la aventura (escenas del PDF)
        ▼
 ③ Paquete de hechos ── qué ha pasado, quién tiene qué, efectos activos,
        │               qué sabe el grupo, indicaciones del PDF para esta escena
        ▼
 ④ Narrador (1 llamada IA) ── narra SOLO el paquete; voces de NPC y compañeros incluidas
        │
        ▼
 ⑤ Validador (código) ── comprobaciones baratas: nada oculto que se cuele,
                          sin restos técnicos; si falla, una corrección como máximo
```

Objetivo: **2 llamadas por turno** (3 como máximo con corrección).

### ① Intérprete

- Devuelve una **unión discriminada** de acciones: `move`, `take`, `give`, `use_item`, `talk`,
  `examine`, `attack`, `check`, `rest`, `ooc`, `clarify`.
- Solo puede elegir **IDs que le damos en listas cerradas**: entidades presentes, objetos del
  inventario, salidas de la sala. Nada de destinos inventados (TASK-078).
- Incluye quién actúa (`actor`), para órdenes a compañeros ("Merryl, léelo").
- Sin decidir reglas: no sabe de tiradas, CD ni efectos.

### ② Motor de reglas

- Un módulo por tipo de acción, todos **genéricos**: no conocen ninguna aventura concreta.
- Lo específico de cada aventura vive en **datos que salen del conversor**:
  - **Objetos con mecánica:** el pergamino sería
    `{ spell: "speak_with_animals", activation: "read_aloud", requiresCheck: false, consumedOnUse: true, affects: "party" }`,
    tal como lo describe el PDF. Si el JSON no dice nada, el pergamino sigue las **reglas oficiales**
    (como ahora: tirada de Arcanos si el conjuro no es de la clase del lector). La excepción solo
    existe porque el PDF de la oveja la describe.
  - **Barreras de comunicación:** "la oveja solo es comprensible con `speak_with_animals`".
  - **Conocimiento del grupo:** cada entidad tiene una cara pública y una secreta; la secreta solo
    llega al narrador cuando un flag la revela. Sustituye a los textos de reemplazo de
    `hiddenIdentityTerms`, que la IA interpretaba como instrucciones.
  - **Disparadores de escena:** condiciones sobre el estado que activan las escenas del PDF. Por
    ejemplo, "Guz llega cuando la oveja ha empezado a contar su historia" (TASK-084).
- El resultado es una **lista de hechos** (`ItemTransferred`, `SpellActivated`, `CheckRolled`,
  `SceneStarted`, `EntityArrived`…) y el estado nuevo.

### ③ Paquete de hechos

Lo único que ve el narrador. Contiene:

- Los hechos de este turno, en orden y en lenguaje llano ("Galador le da el pergamino a Merryl",
  "Merryl lo lee en voz alta; el conjuro se activa para todo el grupo").
- Lo visible de la escena: sala, entidades presentes (solo su cara conocida) y objetos.
- **Las indicaciones del PDF para la escena activa**, traducidas por el conversor pero sin resumir:
  qué hace cada NPC, cómo reacciona, qué revela y cuándo.
- Las fichas de rol (personalidad, objetivos) **solo** de quien puede comunicarse ahora.
- Los últimos mensajes del chat, recortados por código (no por el plugin de Groq).

Así no hay nada que el narrador tenga que adivinar: quién tiene el pergamino, si el conjuro está
activo o qué toca contar está escrito en el paquete.

### ④ Narrador

- Una sola llamada que devuelve la narración del DM, el diálogo de los NPC y, si procede, las
  reacciones de los compañeros (hoy son llamadas aparte).
- Instrucción central: **narrar los hechos del paquete siguiendo las indicaciones del PDF**, sin
  añadir acontecimientos que cambien el estado.

### ⑤ Validador

Reutiliza los invariantes de los escenarios (`runner.ts`): términos secretos no revelados, restos
técnicos (`undefined`, códigos en mayúsculas), CD en la narración… Si algo falla, se pide una
corrección una vez; si vuelve a fallar, se muestra la versión segura.

## 4. Cómo se prueba: escenarios basados en el PDF

1. **Primero se escriben los escenarios del PDF**, escena a escena, y cada expectativa cita el
   pasaje que la justifica. Los escenarios actuales se revisan contra el PDF y se corrigen los que
   lo contradicen (empezando por `oveja-02`).
2. Esos escenarios son la **prueba de aceptación**: el núcleo v2 está listo cuando los pasa mejor
   que el núcleo actual.
3. Los arreglos de la rama `fix/conjuro-persistente` (paso del pergamino, tiradas mal narradas,
   errores de cuota) se convierten en escenarios que el núcleo v2 también tiene que superar.

## 5. Plan de migración (sin romper el juego)

El núcleo v2 se construye **al lado** del actual, detrás de una opción (`CORE_V2=1`), con el mismo
contrato de eventos hacia la interfaz. El juego actual sigue funcionando mientras tanto.

| Paso | Qué | Resultado |
|---|---|---|
| **A** | Escenarios del PDF para toda la oveja, con citas | La vara de medir |
| **B** ✅ | Conversor: objetos con mecánica, disparadores e indicaciones por escena, bloques de estadísticas, mapa completo, IDs estables; regenerar la oveja | El JSON recoge el PDF: la prueba de fidelidad pasa entera (TASK-080, 084, 085, 086, 091 en datos) |
| **C** ✅ | Motor de reglas v2 con tests unitarios (`src/lib/game/core-v2/`, ver §5.1) | Turnos deterministas sin IA |
| **D** | Intérprete y narrador v2 con el paquete de hechos | Primer turno completo con `CORE_V2=1` |
| **E** | Combate: se reutiliza el sistema actual, pero los participantes salen de los datos | TASK-088..091 |
| **F** | Cuando v2 supere al actual en los escenarios: activarlo por defecto y borrar el núcleo viejo | Una sola ruta de código |

Cada paso termina con sus tests en verde y su merge, como hasta ahora.

### 5.1 Paso C: motor de reglas v2 (hecho, 2026-11-12)

Módulo `src/lib/game/core-v2/`, funciones puras sin IA ni nada propio de una aventura:

- **`scene-engine.ts`** — `advanceScenes` evalúa `scenes[].startsWhen` con los sucesos del turno
  (`adventure_start`, `entered_location`, `talked_to`, `attempted_leave`, `entity_defeated`,
  `combat_ended`, `item_obtained`, `item_used`, `scene_started`), flags, sala, `all`/`any` y
  `afterTurns` (se anota el turno en que se cumple el resto y la escena empieza N turnos después).
  Cada escena empieza una vez, aplica `onStart` y pasa a ser la **escena activa**
  (`worldState.coreV2.activeSceneId`); `scene_started` encadena escenas en el mismo turno.
- **`item-rules.ts`** — coger, dar, identificar y usar `items[]`. `activation.check: null` = sin
  tirada (excepción del PDF); con valor = esa prueba; ausente = **reglas oficiales** del pergamino
  de conjuro (DMG): conjuro de tu lista, sin tirada; de nivel superior al que puedes lanzar, prueba
  de característica de lanzamiento CD 10 + nivel (si falla, el pergamino se pierde); fuera de tu
  lista, ininteligible. Ojo: esto corrige lo que decía §3 ("tirada de Arcanos si no es de tu
  clase"), que era la regla casera del núcleo actual, no la oficial. La identificación sin datos
  exige descanso corto o *Identificar*.
- **`spell-rules.ts`** — clases (español e inglés), nivel máximo de conjuro, característica de
  lanzamiento y una tabla corta de conjuros del SRD. Un conjuro que no esté en la tabla devuelve
  `unsupported` y el núcleo actual sigue a cargo.
- **`legacy-bridge.ts`** — mientras llega el paso D: `ItemRuleModuleV2` sustituye a
  `ScrollRuleModule` en las aventuras con `items[]` (sin mirar el texto del jugador) y
  `applyCoreV2EndOfTurn` deduce los sucesos del turno y avanza las escenas, en el turno narrativo y
  tras el combate. Las tiradas de habilidad las sigue resolviendo el sistema actual; las de
  característica, el propio motor.

Todo detrás de `CORE_V2=1`; sin la variable el juego no cambia.

## 6. Decisiones que necesito del usuario

1. **Proveedor de IA.** Con los planes gratuitos (8.000 tokens/minuto en Groq, 5 peticiones/día en
   Gemini 3.5 Flash) no se puede jugar una partida entera ni grabar escenarios con fiabilidad, ni
   siquiera con 2 llamadas por turno. ¿Valoramos un plan de pago barato, aunque sea solo para grabar?
2. **Idioma de las indicaciones del PDF.** El PDF está en inglés. Propuesta: el conversor las
   traduce al español una vez, al convertir, y guarda también el original para poder contrastar.
3. ~~**Reglas de D&D frente al PDF.**~~ **Decidido:** por defecto, reglas oficiales; lo que el PDF
   establezca distinto es una excepción de esa aventura, expresada en sus datos.
