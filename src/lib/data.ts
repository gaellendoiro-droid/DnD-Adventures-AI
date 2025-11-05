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
    ]
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
    ]
  },
];

export const initialMessages: GameMessage[] = [
    {
        id: 'welcome-1',
        sender: 'DM',
        content: "Se encuentran en 'El Portal Bostezante', una posada legendaria en el corazón de la Costa de la Espada. El aire está cargado con el aroma de estofado de carne y el humo de la leña crepitante en el hogar. Un murmullo constante de conversaciones y risas llena la sala común. Podrían acercarse a la barra y charlar con el posadero, buscar una mesa libre para planificar su siguiente paso, o quizás averiguar más sobre la figura solitaria y encapuchada que les observa desde una esquina oscura. El ambiente es un hervidero de oportunidades y peligros latentes. ¿Qué hacen?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
]
