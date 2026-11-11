/**
 * Especificación de "The Wild Sheep Chase" (aventuras/sources/the-wild-sheep-chase.pdf), la
 * VERDAD ABSOLUTA de la aventura (ver docs/nucleo-v2.md, §1).
 *
 * Cada entrada resume en español lo que dice el PDF, con la sección y la página, para que los
 * tests (fidelidad de datos y escenarios de juego) citen la fuente de cada expectativa.
 *
 * Reglas por defecto = reglas oficiales de D&D 5e. Lo que el PDF establezca distinto es una
 * EXCEPCIÓN DE ESTA AVENTURA (marcada con `exception: true`) y debe llegar al juego a través de
 * los datos que genera el conversor, no de código específico.
 */

export interface PdfFact {
    /** Sección del PDF, con su título original. */
    section: string;
    /** Página del PDF (1–6). */
    page: number;
    /** Lo que establece el PDF, resumido en español. */
    says: string;
    /** El PDF se aparta de las reglas oficiales de 5e en este punto. */
    exception?: true;
}

const fact = (section: string, page: number, says: string, exception?: true): PdfFact =>
    ({ section, page, says, ...(exception ? { exception } : {}) });

/** Texto para mensajes de test: «PDF p. 2, "Baaaa-d News": …». */
export const cite = (f: PdfFact): string => `PDF p. ${f.page}, "${f.section}": ${f.says}`;

const BAD_NEWS = 'Baaaa-d News';
const CROOKS = 'Shepherds, Crooks';
const DUST = 'After the Dust Settles';
const HOUSE = 'The House in the Woods';
const NOKE = 'Roleplaying Noke';
const CHOICES = 'Big Choices';
const CONSEQUENCES = 'Consequences';
const WAND = 'Modified Wand of True Polymorph';

export const PDF = {
    opening: {
        downtime: fact(BAD_NEWS, 2, 'La aventura empieza con el grupo pasando la tarde en una ciudad (taberna, su base o paseando por la calle).'),
        sheepArrives: fact(BAD_NEWS, 2, 'Una oveja normal en apariencia (lana blanca, cara negra, cuernos rizados) irrumpe con un pergamino elaborado en la boca.'),
        approachesCaster: fact(BAD_NEWS, 2, 'La oveja se acerca al miembro del grupo con más aptitudes mágicas, le agita el pergamino y deja que lo coja si alarga la mano.'),
        sealNamesScroll: fact(BAD_NEWS, 2, 'Un sello de cera indica que es un Scroll of Speak With Animals (Modified): se sabe qué es sin tirada.', true),
        nodsWhenNamed: fact(BAD_NEWS, 2, 'Si alguien dice en voz alta qué es el pergamino, la oveja asiente y bala con entusiasmo.'),
        readAloudActivates: fact(BAD_NEWS, 2, 'Basta con leerlo en voz alta para activar el conjuro (sin tirada) y todos oyen a la oveja hablar.', true),
        speaksElvenAccent: fact(BAD_NEWS, 2, 'Al activarse, el balido se convierte en Común culto con acento élfico y un leve balido.'),
        introducesHimself: fact(BAD_NEWS, 2, 'Tras comprobar que le entienden, se presenta como Finethir Shinebright, un mago que necesita ayuda urgente.'),
        asksForArtefact: fact(BAD_NEWS, 2, 'Pide ayuda para recuperar un artefacto mágico muy poderoso de un mago peligroso y quizá loco.'),
        howlingInterrupts: fact(BAD_NEWS, 2, 'Poco después de empezar a contar su historia, se oyen aullidos (llega Guz).'),
    },
    guz: {
        arrives: fact(CROOKS, 2, 'Llega Guz, un semiorco enorme, con tres lobos con collares de hierro y una figura encapuchada que es un oso pardo polimorfado.'),
        demandsSheep: fact(CROOKS, 2, 'Exige "la oveja del maestro Noke", que dice que se ha escapado y tiene gran valor sentimental para su amo.'),
        laughsAtTruth: fact(CROOKS, 2, 'Cualquier mención a la verdadera naturaleza de Shinebright recibe una risa hueca.'),
        trackersKnow: fact(CROOKS, 2, 'Sus rastreadores saben que Shinebright está ahí aunque lo escondan; no acepta un no por respuesta.'),
        bribes: fact(CROOKS, 2, 'Prefiere la violencia y la intimidación, pero también ofrece sobornos y favores mágicos.'),
        attacksIfStalled: fact(CROOKS, 2, 'Si no avanza, ataca sin aviso; los lobos le siguen y el oso se quita la capucha y carga rugiendo.'),
        wolvesGrabSheep: fact(CROOKS, 2, 'Los lobos intentan rodear al grupo para capturar a Shinebright; quieren capturarlo, no matarlo.'),
        capturedFlees: fact(CROOKS, 2, 'Si Guz captura a Shinebright, se marcha a casa de Noke y el grupo decide si le persigue.'),
        stats: fact(CROOKS, 2, 'Guz: CA 14 (armadura de cuero), 67 PG (9d8+27), velocidad 30 pies, Temerario, Mandoble giratorio +5 a dos objetivos, 2d6+3.'),
        wolves: fact(CROOKS, 2, 'Tres lobos (MM p. 341).'),
        bear: fact(CROOKS, 2, 'Un oso pardo (MM p. 319).'),
        sheepStats: fact(CROOKS, 2, 'Shinebright usa las estadísticas de un Poni (MM p. 325) con INT 18 y SAB 14.'),
    },
    afterFight: {
        pleads: fact(DUST, 3, 'Derrotados los secuaces, Shinebright suplica ayuda: sin ellos está condenado.'),
        promises: fact(DUST, 3, 'Si el grupo es mercenario, promete grandes recompensas que sabe que no puede cumplir.'),
        tower: fact(DUST, 3, 'Hasta hace dos años vivía en una torre a las afueras; especialista en transmutación con una Vara de Polimorfia Verdadera.'),
        betrayal: fact(DUST, 3, 'Su aprendiz Ahmed Noke le transformó con la vara; desde entonces vive como prisionero en su propio jardín.'),
        escape: fact(DUST, 3, 'Anoche Noke dejó la puerta abierta; Shinebright robó el pergamino de una estantería y huyó a la ciudad.'),
        needsWand: fact(DUST, 3, 'Para volver a su forma necesita otra Polimorfia Verdadera: necesita su vara.'),
        location: fact(DUST, 3, 'Noke vive en la antigua casa de Shinebright, al sureste de la ciudad, y lleva la vara siempre encima.'),
        knowsLayout: fact(DUST, 3, 'Conoce la distribución de su casa al detalle y la describe encantado.'),
    },
    house: {
        path: fact(HOUSE, 4, 'El camino sale de la carretera principal a unas millas de la ciudad y serpentea entre robles.'),
        tracks: fact(HOUSE, 4, 'Quien examine el camino ve huellas de pies y patas; las más frescas coinciden con el grupo de Guz.'),
        platforms: fact(HOUSE, 4, 'La casa son tres plataformas tejidas con ramas de cuatro robles: baja (jardín, 3 m), central (18 m de ancho, 6 m de alto, cerrada, con puerta) y alta (9 m, pequeña).'),
        huts: fact(HOUSE, 4, 'Bajo las plataformas hay dos cabañas de madera y una gran letrina.'),
        apes: fact(HOUSE, 4, 'Al llegar hay tres simios durmiendo o jugando con dados gigantes en el césped, con espadones de hierro clavados al lado.'),
        bearOuthouse: fact(HOUSE, 4, 'Un oso pardo está en la letrina "haciendo sus necesidades".'),
        lockedDoor: fact(HOUSE, 4, 'La puerta de la plataforma central suele estar cerrada: Fuerza (Atletismo) CD 14 para derribarla o herramientas de ladrón CD 12.'),
        inside: fact(HOUSE, 4, 'Dentro hay tres zonas: biblioteca y laboratorio, sala de estar y comedor-cocina.'),
        bedroom: fact(HOUSE, 5, 'La plataforma alta es el dormitorio de Noke: armario, cama grande de madera y tocador.'),
    },
    noke: {
        whereabouts: fact(NOKE, 5, 'Noke está en la plataforma central trabajando en conjuros nuevos.'),
        demands: fact(NOKE, 5, 'Si ve llegar al grupo, exige que devuelvan la oveja a cambio de no destruirlos.'),
        talks: fact(NOKE, 5, 'Si hablan, explica por qué odia a Shinebright, presume de sus logros y pregunta si han matado a "mi hombre, Guz" (le afecta si es así).'),
        refusalCombat: fact(NOKE, 5, 'Si se niegan a devolver a Shinebright, ordena a sus hombres atacar.'),
        tactics: fact(NOKE, 5, 'Lanza Agrandar/Reducir sobre el oso cuando sale de la letrina, apoya con Rayo de Escarcha y cuida la concentración.'),
        apesFlee: fact(NOKE, 5, 'Los simios luchan con espadones (Tajo 2d6+3) y huyen por debajo de la mitad de sus PG.'),
        flees: fact(NOKE, 5, 'Si pierde o alguien se le acerca demasiado, lanza Retirada Expeditiva, se encierra y sube al dormitorio.'),
        bedDragon: fact(NOKE, 5, 'Usa Polimorfia Verdadera sobre su cama: tres rondas después irrumpe montado en una cría de dragón de cama.'),
        mouther: fact(NOKE, 5, 'Si pierde el dragón, usa la vara sobre sí mismo, falla y se convierte en una boca balbuceante que ataca sin control.'),
        stats: fact(NOKE, 5, 'Ahmed Noke: CA 12, 55 PG (10d8+10), lanzador de nivel 7 (CD 14, +6 al ataque).'),
        dragonStats: fact(NOKE, 5, 'Cría de dragón de cama: CA 16, 75 PG (10d8+30), vulnerable al fuego, Aliento de astillas CD 13 (7d6).'),
    },
    ending: {
        damagedWand: fact(CHOICES, 6, 'Al recuperar la vara es evidente que está dañada; quien tenga competencia en Arcanos sabe que la modificaron y es muy poco fiable.'),
        secondScroll: fact(CHOICES, 6, 'Buscando en la plataforma central se encuentra otro pergamino de Hablar con los Animales.'),
        persuasion: fact(CHOICES, 6, 'Shinebright quiere arriesgarse igualmente; un buen argumento y Carisma (Persuasión) CD 15 le hacen reconsiderarlo.'),
        lastWish: fact(CHOICES, 6, 'Antes del conjuro pide que, si muere, avisen a su antiguo colegio.'),
        success: fact(CONSEQUENCES, 6, 'Si el conjuro funciona, no puede pagar (Noke estaba arruinado) pero ofrece transmutaciones de hasta nivel 5 a precio de coste.'),
        failure: fact(CONSEQUENCES, 6, 'Si falla, Shinebright muere; la torre vale unas 1.000 po en material de laboratorio.'),
        xp: fact(CONSEQUENCES, 6, 'Cada aventurero que ayude a Shinebright con Noke recibe 500 PX.'),
    },
    wand: {
        charges: fact(WAND, 6, 'La vara tiene 1d4-1 cargas de Polimorfia Verdadera (mínimo 1), se recargan al amanecer y requiere una hora de sintonía y capacidad de lanzar conjuros.'),
        inspect: fact(WAND, 6, 'Inteligencia (Arcanos) CD 15 al inspeccionarla revela que es muy poco fiable.'),
        useCheck: fact(WAND, 6, 'Cada uso exige Inteligencia (Arcanos) CD 17; si acierta, la CD sube 1; si falla por 5 o menos, el objetivo se convierte en boca balbuceante; si falla por más, además explota (1d12 de fuerza por carga en 3 m).'),
        warn: fact('Not Like This...', 6, 'El DM debe insinuar el peligro de la vara antes de que los jugadores la usen.'),
    },
} as const;
