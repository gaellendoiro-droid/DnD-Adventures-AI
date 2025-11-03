import type { Character, GameMessage } from "./types";

export const initialParty: Character[] = [
  {
    id: "1",
    name: "Galador",
    race: "Humano",
    class: "Paladín",
    level: 1,
    color: '#3b82f6', // blue-500
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
  },
  {
    id: "2",
    name: "Elara",
    race: "Semielfa",
    class: "Clériga",
    level: 1,
    color: '#f97316', // orange-500
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
      { name: "Perspicacia", proficient: false },
    ],
    controlledBy: "AI",
  },
  {
    id: "3",
    name: "Merryl",
    race: "Mediano",
    class: "Mago",
    level: 1,
    color: '#8b5cf6', // violet-500
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
      { name: "Sigilo", proficient: false },
    ],
    controlledBy: "AI",
  },
];

export const initialMessages: GameMessage[] = [
    {
        id: 'welcome-1',
        sender: 'DM',
        content: "¡Saludos, aventureros! Se reúnen en la posada 'El Portal Bostezante', famosa en toda la Costa de la Espada. El aire huele a estofado y madera vieja. Un murmullo de conversaciones llena la sala común, pero una figura encapuchada en una esquina oscura les hace señas. ¿Qué hacen?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
]
