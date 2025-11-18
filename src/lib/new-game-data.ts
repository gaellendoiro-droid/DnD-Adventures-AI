
import type { Character, GameMessage } from "./types";

export const initialParty: Character[] = [
  {
    id: "1",
    name: "Galador",
    race: "Humano",
    characterClass: "Paladín",
    level: 1,
    sex: "Varón",
    background: "Noble",
    color: '#3b82f6', // blue-500
    personality: "Un paladín recto y honorable, a veces un poco ingenuo. Siempre busca hacer lo correcto y proteger a los inocentes. Es el líder moral del grupo.",
    alignment: "Legal Bueno",
    abilityScores: {
      fuerza: 16,
      destreza: 10,
      constitución: 14,
      inteligencia: 8,
      sabiduría: 12,
      carisma: 15,
    },
    abilityModifiers: {
      fuerza: 2,
      destreza: 0,
      constitución: 2,
      inteligencia: -1,
      sabiduría: 1,
      carisma: 2,
    },
    proficiencyBonus: 2, // Nivel 1: BC +2
    hp: { current: 20, max: 20 }, // Corregido: Paladín nivel 1 (10) + CON mod (2) = 12
    ac: 18, // Corregido: Armadura de placas (18) + Escudo (2) = 20, pero sin escudo = 18 (o 20 con escudo)
    speed: 30, // Humano base
    initiative: 0, // Modificador de Destreza
    savingThrows: {
      fuerza: 2, // Modificador + BC (competente)
      destreza: 0,
      constitución: 2,
      inteligencia: -1,
      sabiduría: 3, // Modificador + BC (competente)
      carisma: 4, // Modificador + BC (competente)
    },
    isDead: false,
    skills: [
      // Todas las habilidades de D&D 5e
      { name: "Atletismo", proficient: true }, // FUE - Competente (clase + trasfondo)
      { name: "Acrobacias", proficient: false }, // DES
      { name: "Juego de Manos", proficient: false }, // DES
      { name: "Sigilo", proficient: false }, // DES
      { name: "Arcano", proficient: false }, // INT
      { name: "Historia", proficient: true }, // INT - Competente (trasfondo Noble)
      { name: "Investigación", proficient: false }, // INT
      { name: "Naturaleza", proficient: false }, // INT
      { name: "Religión", proficient: false }, // INT
      { name: "Trato con Animales", proficient: false }, // SAB
      { name: "Percepción", proficient: false }, // SAB
      { name: "Perspicacia", proficient: true }, // SAB - Competente (clase)
      { name: "Medicina", proficient: false }, // SAB
      { name: "Supervivencia", proficient: false }, // SAB
      { name: "Engañar", proficient: false }, // CAR
      { name: "Intimidar", proficient: false }, // CAR
      { name: "Interpretación", proficient: false }, // CAR
      { name: "Persuasión", proficient: true }, // CAR - Competente (clase + trasfondo)
    ],
    controlledBy: "Player",
    inventory: [
        { id: "item-1", name: "Mandoble", quantity: 1, description: "Una espada a dos manos pesada y fiable. Ataque: +4, Daño: 2d6+2 (Cortante), Alcance: 5 pies. Propiedades: Pesada, Dos manos, Versátil." },
        { id: "item-2", name: "Armadura de placas", quantity: 1, description: "Cubre todo el cuerpo y ofrece una gran protección. CA 18." },
        { id: "item-3", name: "Escudo", quantity: 1, description: "Un escudo de madera reforzado con acero. +2 CA." },
        { id: "item-4", name: "Paquete de aventurero", quantity: 1, description: "Contiene raciones, una cuerda, un saco de dormir y otros enseres básicos." },
        { id: "item-gp-1", name: "Monedas de Oro", quantity: 25, description: "Dinero contante y sonante." },
    ],
    attacks: [
      {
        id: "attack-1",
        name: "Mandoble",
        attackBonus: 4, // FUE mod (2) + BC (2)
        damage: "2d6+2",
        damageType: "Cortante",
        range: "5 pies",
        properties: ["Pesada", "Dos manos", "Versátil"]
      },
    ],
    racialTraits: [
      {
        name: "Aumento de Características",
        description: "Tu puntuación de Fuerza, Destreza, Constitución, Inteligencia, Sabiduría y Carisma aumenta en 1."
      },
      {
        name: "Idiomas",
        description: "Puedes hablar, leer y escribir Común y un idioma adicional de tu elección."
      }
    ],
    classFeatures: [
      {
        name: "Curación por Manos",
        description: "Tienes el poder de sanar a los heridos con un toque. Como acción, puedes gastar un dado de golpe para restaurar 1d6+1 puntos de golpe a una criatura que toques."
      },
      {
        name: "Detectar el Mal y el Bien",
        description: "Como acción, puedes abrir tu conciencia para detectar fuerzas del bien y del mal. Hasta el final de tu próximo turno, conoces la ubicación de cualquier celestial, infernal o no muerto dentro de 60 pies de ti."
      },
      {
        name: "Sentido Divino",
        description: "La presencia de una fuerte aura de bien o mal (como la que emana de un clérigo de alto nivel o de un no muerto) es tan ofensiva para tu conciencia que tu grito de advertencia puede localizar su origen."
      }
    ],
    appearance: "Un hombre alto y fornido con cabello rubio y ojos azules. Viste una armadura de placas reluciente con el emblema de su orden paladinesca. Su porte es noble y confiado.",
    ideals: "Protección. Es mi deber proteger a los inocentes y defender a los débiles.",
    bonds: "Mi familia noble me enseñó el valor del honor y el deber. Debo mantener su legado.",
    flaws: "A veces soy demasiado confiado y puedo ser engañado por aquellos que aparentan bondad.",
    experience: 0,
    deathSaves: {
      successes: 0,
      failures: 0
    },
    spells: []
  },
  {
    id: "6",
    name: "Merryl",
    race: "Mediano",
    characterClass: "Mago",
    level: 1,
    sex: "Varón",
    background: "Erudito",
    color: '#8b5cf6', // violet-500
    personality: "Un mago mediano curioso y un poco imprudente. Le fascina la magia y el descubrimiento, a veces a costa de la seguridad. Es optimista, le gusta hacer bromas y es un poco cleptómano.",
    alignment: "Caótico Bueno",
    abilityScores: {
      fuerza: 8,
      destreza: 16,
      constitución: 14,
      inteligencia: 17,
      sabiduría: 10,
      carisma: 10,
    },
    abilityModifiers: {
      fuerza: -1,
      destreza: 3,
      constitución: 2,
      inteligencia: 3,
      sabiduría: 0,
      carisma: 0,
    },
    proficiencyBonus: 2, // Nivel 1: BC +2
    hp: { current: 20, max: 20 }, // Corregido: Mago nivel 1 (6) + CON mod (2) = 8
    ac: 13, // Corregido: Sin armadura (10) + DES mod (3) = 13. Con Armadura de Mago sería 16.
    speed: 25, // Mediano base
    initiative: 3, // Modificador de Destreza
    savingThrows: {
      fuerza: -1,
      destreza: 3,
      constitución: 2,
      inteligencia: 5, // Modificador + BC (competente)
      sabiduría: 2, // Modificador + BC (competente)
      carisma: 0,
    },
    isDead: false,
    skills: [
      // Todas las habilidades de D&D 5e
      { name: "Atletismo", proficient: false }, // FUE
      { name: "Acrobacias", proficient: false }, // DES
      { name: "Juego de Manos", proficient: true }, // DES - Competente (trasfondo Erudito)
      { name: "Sigilo", proficient: false }, // DES
      { name: "Arcano", proficient: true }, // INT - Competente (clase)
      { name: "Historia", proficient: true }, // INT - Competente (trasfondo Erudito)
      { name: "Investigación", proficient: true }, // INT - Competente (clase + trasfondo)
      { name: "Naturaleza", proficient: false }, // INT
      { name: "Religión", proficient: false }, // INT
      { name: "Trato con Animales", proficient: false }, // SAB
      { name: "Percepción", proficient: false }, // SAB
      { name: "Perspicacia", proficient: false }, // SAB
      { name: "Medicina", proficient: false }, // SAB
      { name: "Supervivencia", proficient: false }, // SAB
      { name: "Engañar", proficient: false }, // CAR
      { name: "Intimidar", proficient: false }, // CAR
      { name: "Interpretación", proficient: false }, // CAR
      { name: "Persuasión", proficient: false }, // CAR
    ],
    controlledBy: "AI",
    inventory: [
        { id: "item-9", name: "Bastón", quantity: 1, description: "Un bastón de roble nudoso que le sirve como foco arcano. Ataque: +1, Daño: 1d4-1 (Contundente), Alcance: 5 pies. Propiedades: Versátil (1d6)." },
        { id: "item-10", name: "Libro de conjuros", quantity: 1, description: "Un tomo ajado lleno de sus conjuros iniciales." },
        { id: "item-11", name: "Componentes de conjuros", quantity: 1, description: "Una pequeña bolsa con los materiales necesarios para sus hechizos." },
        { id: "item-gp-3", name: "Monedas de Oro", quantity: 10, description: "Dinero contante y sonante." },
    ],
    attacks: [
      {
        id: "attack-2",
        name: "Bastón",
        attackBonus: 1, // FUE mod (-1) + BC (2)
        damage: "1d4-1",
        damageType: "Contundente",
        range: "5 pies",
        properties: ["Versátil (1d6)"]
      },
    ],
    racialTraits: [
      {
        name: "Aumento de Características",
        description: "Tu puntuación de Destreza aumenta en 2 y tu puntuación de Constitución aumenta en 1."
      },
      {
        name: "Edad",
        description: "Un mediano alcanza la madurez a los 20 años y vive hasta alrededor de los 150."
      },
      {
        name: "Tamaño",
        description: "Los medianos miden alrededor de 3 pies de alto y pesan alrededor de 40 libras. Tu tamaño es Pequeño."
      },
      {
        name: "Velocidad",
        description: "Tu velocidad base al caminar es de 25 pies."
      },
      {
        name: "Suerte",
        description: "Cuando saques un 1 en una tirada de ataque, prueba de característica o tirada de salvación, puedes volver a tirar el dado y debes usar el nuevo resultado."
      },
      {
        name: "Valiente",
        description: "Tienes ventaja en las tiradas de salvación contra ser asustado."
      },
      {
        name: "Agilidad Mediana",
        description: "Puedes moverte a través del espacio de cualquier criatura que sea de un tamaño más grande que el tuyo."
      },
      {
        name: "Idiomas",
        description: "Puedes hablar, leer y escribir Común y Mediano."
      }
    ],
    classFeatures: [
      {
        name: "Lanzamiento de Conjuros",
        description: "Eres un estudiante de las artes arcanas. Tienes un libro de conjuros que contiene los conjuros que conoces."
      },
      {
        name: "Recuperación Arcana",
        description: "Has aprendido a recuperar parte de tu energía mágica estudiando tu libro de conjuros. Una vez al día, cuando termines un descanso corto, puedes recuperar ranuras de conjuro de nivel 1 o superior. El número de ranuras que recuperas es igual a la mitad de tu nivel de mago (redondeado hacia arriba)."
      }
    ],
    spellSlots: {
      level0: 999, // Trucos ilimitados
      level1: 2, // Ranuras de nivel 1
    },
    spellSaveDC: 13, // 8 + BC (2) + INT mod (3)
    spellAttackBonus: 5, // BC (2) + INT mod (3)
    appearance: "Un mediano de estatura pequeña con cabello castaño desordenado y ojos verdes brillantes. Viste ropas de viaje con varios bolsillos llenos de componentes de conjuros. Siempre tiene una sonrisa traviesa.",
    ideals: "Conocimiento. El camino hacia el poder y la automejora es a través del conocimiento.",
    bonds: "Mi libro de conjuros es mi tesoro más preciado. Contiene todo lo que he aprendido.",
    flaws: "Soy demasiado curioso por mi propio bien. A veces meto la nariz donde no debo.",
    experience: 0,
    deathSaves: {
      successes: 0,
      failures: 0
    },
    spells: []
    // TEMPORALMENTE DESHABILITADO PARA TESTS DE ARMAS - Restaurar después
    // spells: [
    //     { id: "spell-8", name: "Luz", level: 0, description: "Haces que un objeto brille como una antorcha." },
    //     { id: "spell-9", name: "Mano de mago", level: 0, description: "Creas una mano espectral flotante que puede manipular objetos." },
    //     { id: "spell-10", name: "Rayo de escarcha", level: 0, description: "Un rayo de luz azul fría hiere y ralentiza a un enemigo." },
    //     { id: "spell-11", name: "Dardo mágico", level: 1, description: "Creas tres dardos de fuerza mágica que impactan infaliblemente a sus objetivos." },
    //     { id: "spell-12", name: "Dormir", level: 1, description: "Pones a las criaturas en un sueño mágico." },
    //     { id: "spell-13", name: "Hechizar persona", level: 1, description: "Encantas a un humanoide para que te considere un amigo." },
    //     { id: "spell-14", name: "Armadura de mago", level: 1, description: "Una fuerza mágica protectora te rodea, estableciendo tu CA base en 13 + tu modificador de Destreza." },
    // ]
  },
  // {
  //   id: "3",
  //   name: "Elara",
  //   race: "Semielfa",
  //   characterClass: "Clériga",
  //   level: 1,
  //   sex: "Mujer",
  //   background: "Acólita",
  //   color: '#f97316', // orange-500
  //   personality: "Una clériga devota pero pragmática. Tiende a ser la voz de la razón y la moral del grupo, pero no es ingenua. Es protectora y cautelosa, y a menudo desconfía de la magia arcana.",
  //   alignment: "Legal Bueno",
  //   abilityScores: {
  //     fuerza: 14,
  //     destreza: 8,
  //     constitución: 15,
  //     inteligencia: 10,
  //     sabiduría: 16,
  //     carisma: 12,
  //   },
  //   abilityModifiers: {
  //     fuerza: 2,
  //     destreza: -1,
  //     constitución: 2,
  //     inteligencia: 0,
  //     sabiduría: 3,
  //     carisma: 1,
  //   },
  //   proficiencyBonus: 2, // Nivel 1: BC +2
  //   hp: { current: 20, max: 20 }, // Corregido: Clériga nivel 1 (8) + CON mod (2) = 10
  //   ac: 13, // Corregido: Armadura de escamas (14) + DES mod (-1) = 13
  //   speed: 30, // Semielfa base
  //   initiative: -1, // Modificador de Destreza
  //   savingThrows: {
  //     fuerza: 2,
  //     destreza: -1,
  //     constitución: 2,
  //     inteligencia: 0,
  //     sabiduría: 5, // Modificador + BC (competente)
  //     carisma: 3, // Modificador + BC (competente)
  //   },
  //   isDead: false,
  //   skills: [
  //     // Todas las habilidades de D&D 5e
  //     { name: "Atletismo", proficient: false }, // FUE
  //     { name: "Acrobacias", proficient: false }, // DES
  //     { name: "Juego de Manos", proficient: false }, // DES
  //     { name: "Sigilo", proficient: false }, // DES
  //     { name: "Arcano", proficient: false }, // INT
  //     { name: "Historia", proficient: false }, // INT
  //     { name: "Investigación", proficient: false }, // INT
  //     { name: "Naturaleza", proficient: false }, // INT
  //     { name: "Religión", proficient: true }, // INT - Competente (clase + trasfondo)
  //     { name: "Trato con Animales", proficient: false }, // SAB
  //     { name: "Percepción", proficient: false }, // SAB
  //     { name: "Perspicacia", proficient: true }, // SAB - Competente (clase)
  //     { name: "Medicina", proficient: true }, // SAB - Competente (clase + trasfondo)
  //     { name: "Supervivencia", proficient: false }, // SAB
  //     { name: "Engañar", proficient: false }, // CAR
  //     { name: "Intimidar", proficient: false }, // CAR
  //     { name: "Interpretación", proficient: false }, // CAR
  //     { name: "Persuasión", proficient: false }, // CAR
  //   ],
  //   controlledBy: "AI",
  //   inventory: [
  //       { id: "item-5", name: "Maza", quantity: 1, description: "Un arma contundente simple pero efectiva. Ataque: +4, Daño: 1d6+2 (Contundente), Alcance: 5 pies." },
  //       { id: "item-6", name: "Armadura de escamas", quantity: 1, description: "Armadura de cuero reforzada con escamas de metal. CA 14." },
  //       { id: "item-7", name: "Símbolo sagrado", quantity: 1, description: "Un amuleto de plata que canaliza su poder divino." },
  //       { id: "item-8", name: "Paquete de sacerdote", quantity: 1, description: "Incluye agua bendita, viales y otros objetos para sus rituales." },
  //       { id: "item-gp-2", name: "Monedas de Oro", quantity: 15, description: "Dinero contante y sonante." },
  //   ],
  //   attacks: [
  //     {
  //       id: "attack-3",
  //       name: "Maza",
  //       attackBonus: 4, // FUE mod (2) + BC (2)
  //       damage: "1d6+2",
  //       damageType: "Contundente",
  //       range: "5 pies",
  //       properties: []
  //     },
  //   ],
  //   racialTraits: [
  //     {
  //       name: "Aumento de Características",
  //       description: "Tu puntuación de Carisma aumenta en 2 y otras dos puntuaciones de característica de tu elección aumentan en 1."
  //     },
  //     {
  //       name: "Edad",
  //       description: "Los semielfos maduran al mismo ritmo que los humanos y alcanzan la edad adulta alrededor de los 20 años. Viven mucho más que los humanos, a menudo superando los 180 años."
  //     },
  //     {
  //       name: "Tamaño",
  //       description: "Los semielfos tienen el mismo rango de altura y peso que los humanos. Tu tamaño es Mediano."
  //     },
  //     {
  //       name: "Velocidad",
  //       description: "Tu velocidad base al caminar es de 30 pies."
  //     },
  //     {
  //       name: "Visión en la Oscuridad",
  //       description: "Gracias a tu sangre élfica, tienes una visión superior en la oscuridad y la penumbra. Puedes ver en penumbra dentro de 60 pies de ti como si fuera luz brillante, y en oscuridad como si fuera penumbra."
  //     },
  //     {
  //       name: "Ascendencia Feérica",
  //       description: "Tienes ventaja en las tiradas de salvación contra ser hechizado y no puedes ser puesto a dormir por magia."
  //     },
  //     {
  //       name: "Idiomas",
  //       description: "Puedes hablar, leer y escribir Común, Élfico y un idioma adicional de tu elección."
  //     }
  //   ],
  //   classFeatures: [
  //     {
  //       name: "Lanzamiento de Conjuros",
  //       description: "Como estudiante de la magia divina, tienes acceso a una lista de conjuros basada en tu sabiduría."
  //     },
  //     {
  //       name: "Dominio Divino",
  //       description: "Al nivel 1, eliges un dominio asociado con tu deidad. Cada dominio tiene características especiales y te da acceso a conjuros de dominio."
  //     },
  //     {
  //       name: "Canalizar Divinidad",
  //       description: "A nivel 2, obtienes la capacidad de canalizar energía divina directamente de tu deidad, usando esa energía para alimentar efectos mágicos."
  //     }
  //   ],
  //   spellSlots: {
  //     level0: 999, // Trucos ilimitados
  //     level1: 2, // Ranuras de nivel 1
  //   },
  //   spellSaveDC: 13, // 8 + BC (2) + SAB mod (3)
  //   spellAttackBonus: 5, // BC (2) + SAB mod (3)
  //   appearance: "Una mujer semielfa con rasgos delicados que combinan lo mejor de humanos y elfos. Tiene cabello castaño claro y ojos verdes. Viste túnicas simples pero bien cuidadas con símbolos sagrados bordados.",
  //   ideals: "Servicio. Es mi deber servir a mi deidad y ayudar a aquellos que lo necesitan.",
  //   bonds: "Mi templo y mi orden son mi familia. Debo protegerlos y mantener sus valores.",
  //   flaws: "A veces soy demasiado rígida en mis creencias y puedo ser desconfiada de la magia arcana.",
  //   experience: 0,
  //   deathSaves: {
  //     successes: 0,
  //     failures: 0
  //   },
  //   spells: []
  //   // TEMPORALMENTE DESHABILITADO PARA TESTS DE ARMAS - Restaurar después
  //   // spells: [
  //   //     { id: "spell-1", name: "Luz", level: 0, description: "Haces que un objeto brille como una antorcha." },
  //   //     { id: "spell-2", name: "Llama sagrada", level: 0, description: "Una llama divina desciende sobre una criatura, que debe superar una salvación de Destreza o recibir daño radiante." },
  //   //     { id: "spell-3", name: "Orientación divina", level: 0, description: "Tocas a una criatura y le otorgas un d4 extra en una prueba de habilidad." },
  //   //     // TEMPORALMENTE DESHABILITADO PARA TESTS - Restaurar después de los tests
  //   //     // { id: "spell-4", name: "Curar heridas", level: 1, description: "Restauras puntos de golpe a una criatura que toques." },
  //   //     { id: "spell-5", name: "Escudo de fe", level: 1, description: "Proteges a una criatura con un campo divino, otorgándole +2 a la CA." },
  //   //     // TEMPORALMENTE DESHABILITADO PARA TESTS - Restaurar después de los tests
  //   //     // { id: "spell-6", name: "Palabra de curación", level: 1, description: "Curación a distancia como una acción adicional." },
  //   //     { id: "spell-7", name: "Infligir heridas", level: 1, description: "Un toque necrótico que causa un gran daño." },
  //   // ]
  // },
];

export const initialMessage: GameMessage = {
  id: "initial-dm-message",
  sender: "DM",
  content: `<h3>¡Bienvenidos a "El Dragón del Pico Agujahelada"!</h3><p>Acabáis de llegar al pueblo de <strong>Phandalin</strong> tras varios días de viaje por caminos escarpados. El aire gélido de las Montañas de la Espada os recibe en este asentamiento minero que lucha por resurgir de sus cenizas. Casas de madera nueva se mezclan con ruinas de piedra, testigos de una grandeza pasada. Sin embargo, una sombra se cierne sobre el pueblo: un joven dragón blanco llamado <strong>Cryovain</strong> ha reclamado el cercano Pico Agujahelada, y su presencia empuja a orcos y otras bestias a las tierras bajas.</p><p>Os encontráis en la plaza del pueblo. A vuestro alrededor, la vida continúa con una tensión palpable. Podéis ver la modesta <strong>Posada Rocacolina</strong>, la tienda de <strong>Suministros Barthen</strong>, el <strong>Bazar Escudo de León</strong>, un pequeño <strong>Santuario de la Suerte</strong>, la <strong>Casa de Cambio</strong> y la residencia del alcalde <strong>Harbin Wester</strong>. Justo enfrente, junto a la casa consistorial, un <strong>tablón de anuncios</strong> de madera atrae vuestra atención con varios carteles escritos con caligrafía nerviosa.</p><p>El futuro de Phandalin es incierto. Sus gentes necesitan héroes. ¿Qué hacéis?</p>`,
  originalContent: `¡Bienvenidos a "El Dragón del Pico Agujahelada"! Acabáis de llegar al pueblo de Phandalin tras varios días de viaje por caminos escarpados. El aire gélido de las Montañas de la Espada os recibe en este asentamiento minero que lucha por resurgir de sus cenizas. Casas de madera nueva se mezclan con ruinas de piedra, testigos de una grandeza pasada. Sin embargo, una sombra se cierne sobre el pueblo: un joven dragón blanco llamado Cryovain ha reclamado el cercano Pico Agujahelada, y su presencia empuja a orcos y otras bestias a las tierras bajas. Os encontráis en la plaza del pueblo. A vuestro alrededor, la vida continúa con una tensión palpable. Podéis ver la modesta Posada Rocacolina, la tienda de Suministros Barthen, el Bazar Escudo de León, un pequeño Santuario de la Suerte, la Casa de Cambio y la residencia del alcalde Harbin Wester. Justo enfrente, junto a la casa consistorial, un tablón de anuncios de madera atrae vuestra atención con varios carteles escritos con caligrafía nerviosa. El futuro de Phandalin es incierto. Sus gentes necesitan héroes. ¿Qué hacéis?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

    
