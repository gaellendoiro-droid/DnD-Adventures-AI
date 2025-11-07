
import type { Character, GameMessage } from "./types";

export const initialParty: Character[] = [
  {
    id: "1",
    name: "Galador",
    race: "Humano",
    class: "Paladín",
    level: 1,
    sex: "Varón",
    background: "Noble",
    color: '#3b82f6', // blue-500
    personality: "Un paladín recto y honorable, a veces un poco ingenuo. Siempre busca hacer lo correcto y proteger a los inocentes. Es el líder moral del grupo.",
    abilityScores: {
      fuerza: 16,
      destreza: 10,
      constitución: 14,
      inteligencia: 8,
      sabiduría: 12,
      carisma: 15,
    },
    hp: { current: 12, max: 12 },
    ac: 18,
    skills: [
      { name: "Atletismo", proficient: true },
      { name: "Persuasión", proficient: true },
      { name: "Perspicacia", proficient: false },
    ],
    controlledBy: "Player",
    inventory: [
        { id: "item-1", name: "Mandoble", quantity: 1, description: "Una espada a dos manos pesada y fiable." },
        { id: "item-2", name: "Armadura de placas", quantity: 1, description: "Cubre todo el cuerpo y ofrece una gran protección." },
        { id: "item-3", name: "Escudo", quantity: 1, description: "Un escudo de madera reforzado con acero." },
        { id: "item-4", name: "Paquete de aventurero", quantity: 1, description: "Contiene raciones, una cuerda, un saco de dormir y otros enseres básicos." },
        { id: "item-gp-1", name: "Monedas de Oro", quantity: 25, description: "Dinero contante y sonante." },
    ],
    spells: []
  },
  {
    id: "2",
    name: "Elara",
    race: "Semielfa",
    class: "Clériga",
    level: 1,
    sex: "Mujer",
    background: "Acólita",
    color: '#f97316', // orange-500
    personality: "Una clériga devota pero pragmática. Tiende a ser la voz de la razón y la moral del grupo, pero no es ingenua. Es protectora y cautelosa, y a menudo desconfía de la magia arcana.",
    abilityScores: {
      fuerza: 14,
      destreza: 8,
      constitución: 15,
      inteligencia: 10,
      sabiduría: 16,
      carisma: 12,
    },
    hp: { current: 10, max: 10 },
    ac: 18,
    skills: [
      { name: "Medicina", proficient: true },
      { name: "Religión", proficient: true },
      { name: "Perspicacia", proficient: true },
    ],
    controlledBy: "AI",
    inventory: [
        { id: "item-5", name: "Maza", quantity: 1, description: "Un arma contundente simple pero efectiva." },
        { id: "item-6", name: "Armadura de escamas", quantity: 1 },
        { id: "item-7", name: "Símbolo sagrado", quantity: 1, description: "Un amuleto de plata que canaliza su poder divino." },
        { id: "item-8", name: "Paquete de sacerdote", quantity: 1, description: "Incluye agua bendita, viales y otros objetos para sus rituales." },
        { id: "item-gp-2", name: "Monedas de Oro", quantity: 15, description: "Dinero contante y sonante." },
    ],
    spells: [
        { id: "spell-1", name: "Luz", level: 0, description: "Haces que un objeto brille como una antorcha." },
        { id: "spell-2", name: "Llama sagrada", level: 0, description: "Una llama divina desciende sobre una criatura, que debe superar una salvación de Destreza o recibir daño radiante." },
        { id: "spell-3", name: "Orientación divina", level: 0, description: "Tocas a una criatura y le otorgas un d4 extra en una prueba de habilidad." },
        { id: "spell-4", name: "Curar heridas", level: 1, description: "Restauras puntos de golpe a una criatura que toques." },
        { id: "spell-5", name: "Escudo de fe", level: 1, description: "Proteges a una criatura con un campo divino, otorgándole +2 a la CA." },
        { id: "spell-6", name: "Palabra de curación", level: 1, description: "Curación a distancia como una acción adicional." },
        { id: "spell-7", name: "Infligir heridas", level: 1, description: "Un toque necrótico que causa un gran daño." },
    ]
  },
  {
    id: "3",
    name: "Merryl",
    race: "Mediano",
    class: "Mago",
    level: 1,
    sex: "Varón",
    background: "Erudito",
    color: '#8b5cf6', // violet-500
    personality: "Un mago mediano curioso y un poco imprudente. Le fascina la magia y el descubrimiento, a veces a costa de la seguridad. Es optimista, le gusta hacer bromas y es un poco cleptómano.",
    abilityScores: {
      fuerza: 8,
      destreza: 16,
      constitución: 14,
      inteligencia: 17,
      sabiduría: 10,
      carisma: 10,
    },
    hp: { current: 8, max: 8 },
    ac: 13,
    skills: [
      { name: "Arcano", proficient: true },
      { name: "Investigación", proficient: true },
      { name: "Juego de Manos", proficient: true },
    ],
    controlledBy: "AI",
    inventory: [
        { id: "item-9", name: "Bastón", quantity: 1, description: "Un bastón de roble nudoso que le sirve como foco arcano." },
        { id: "item-10", name: "Libro de conjuros", quantity: 1, description: "Un tomo ajado lleno de sus conjuros iniciales." },
        { id: "item-11", name: "Componentes de conjuros", quantity: 1, description: "Una pequeña bolsa con los materiales necesarios para sus hechizos." },
        { id: "item-gp-3", name: "Monedas de Oro", quantity: 10, description: "Dinero contante y sonante." },
    ],
    spells: [
        { id: "spell-8", name: "Luz", level: 0, description: "Haces que un objeto brille como una antorcha." },
        { id: "spell-9", name: "Mano de mago", level: 0, description: "Creas una mano espectral flotante que puede manipular objetos." },
        { id: "spell-10", name: "Rayo de escarcha", level: 0, description: "Un rayo de luz azul fría hiere y ralentiza a un enemigo." },
        { id: "spell-11", name: "Dardo mágico", level: 1, description: "Creas tres dardos de fuerza mágica que impactan infaliblemente a sus objetivos." },
        { id: "spell-12", name: "Dormir", level: 1, description: "Pones a las criaturas en un sueño mágico." },
        { id: "spell-13", name: "Hechizar persona", level: 1, description: "Encantas a un humanoide para que te considere un amigo." },
        { id: "spell-14", name: "Armadura de mago", level: 1, description: "Una fuerza mágica protectora te rodea, estableciendo tu CA base en 13 + tu modificador de Destreza." },
    ]
  },
];

export const initialMessage: GameMessage = {
  id: "initial-dm-message",
  sender: "DM",
  content: `<h3>¡Bienvenidos a la aventura "El Dragón del Pico Agujahelada"!</h3><p>El aire gélido de las Montañas de la Espada os da la bienvenida a <strong>Phandalin</strong>, un asentamiento minero que lucha por resurgir de sus cenizas. Casas de madera nueva se mezclan con ruinas de piedra, testigos de una grandeza pasada. Sin embargo, una sombra se cierne sobre el pueblo: un joven dragón blanco llamado <strong>Cryovain</strong> ha reclamado el cercano Pico Agujahelada, y su presencia empuja a orcos y otras bestias a las tierras bajas.</p><p>Os encontráis en la plaza del pueblo. A vuestro alrededor, la vida continúa con una tensión palpable. Podéis ver la modesta <strong>Posada Rocacolina</strong>, la tienda de <strong>Suministros Barthen</strong>, y el <strong>Bazar Escudo de León</strong>, que vende armas y armaduras. Justo enfrente, junto a la casa consistorial, un <strong>tablón de anuncios</strong> de madera atrae vuestra atención. Varios carteles, escritos con caligrafía nerviosa, ofrecen recompensas por diversos trabajos.</p><p>El futuro de Phandalin es incierto. Sus gentes necesitan héroes. ¿Qué hacéis?</p>`,
  originalContent: `¡Bienvenidos a la aventura "El Dragón del Pico Agujahelada"! El aire gélido de las Montañas de la Espada os da la bienvenida a Phandalin, un asentamiento minero que lucha por resurgir de sus cenizas. Casas de madera nueva se mezclan con ruinas de piedra, testigos de una grandeza pasada. Sin embargo, una sombra se cierne sobre el pueblo: un joven dragón blanco llamado Cryovain ha reclamado el cercano Pico Agujahelada, y su presencia empuja a orcos y otras bestias a las tierras bajas. Os encontráis en la plaza del pueblo. A vuestro alrededor, la vida continúa con una tensión palpable. Podéis ver la modesta Posada Rocacolina, la tienda de Suministros Barthen, y el Bazar Escudo de León, que vende armas y armaduras. Justo enfrente, junto a la casa consistorial, un tablón de anuncios de madera atrae vuestra atención. Varios carteles, escritos con caligrafía nerviosa, ofrecen recompensas por diversos trabajos. El futuro de Phandalin es incierto. Sus gentes necesitan héroes. ¿Qué hacéis?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

    

    