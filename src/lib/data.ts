import type { Character, GameMessage } from "./types";

export const initialParty: Character[] = [
  {
    id: "1",
    name: "Aelar",
    race: "Elfo",
    class: "Guerrero",
    level: 1,
    color: '#3b82f6', // blue-500
    abilityScores: {
      fuerza: 16,
      destreza: 14,
      constitución: 15,
      inteligencia: 10,
      sabiduría: 12,
      carisma: 8,
    },
    hp: { current: 12, max: 12 },
    ac: 16,
    skills: [
      { name: "Acrobacias", proficient: true },
      { name: "Atletismo", proficient: true },
      { name: "Percepción", proficient: false },
    ],
    controlledBy: "Player",
  },
  {
    id: "2",
    name: "Lyra",
    race: "Humana",
    class: "Maga",
    level: 1,
    color: '#8b5cf6', // violet-500
    abilityScores: {
      fuerza: 8,
      destreza: 14,
      constitución: 13,
      inteligencia: 17,
      sabiduría: 12,
      carisma: 10,
    },
    hp: { current: 8, max: 8 },
    ac: 12,
    skills: [
      { name: "Arcano", proficient: true },
      { name: "Historia", proficient: true },
      { name: "Investigación", proficient: false },
    ],
    controlledBy: "AI",
  },
  {
    id: "3",
    name: "Kaelen",
    race: "Mediano",
    class: "Pícaro",
    level: 1,
    color: '#10b981', // emerald-500
    abilityScores: {
      fuerza: 10,
      destreza: 17,
      constitución: 12,
      inteligencia: 14,
      sabiduría: 8,
      carisma: 13,
    },
    hp: { current: 9, max: 9 },
    ac: 14,
    skills: [
      { name: "Engaño", proficient: true },
      { name: "Juego de Manos", proficient: false },
      { name: "Sigilo", proficient: true },
    ],
    controlledBy: "AI",
  },
  {
    id: "4",
    name: "Bror",
    race: "Enano",
    class: "Clérigo",
    level: 1,
    color: '#f97316', // orange-500
    abilityScores: {
      fuerza: 15,
      destreza: 8,
      constitución: 16,
      inteligencia: 10,
      sabiduría: 16,
      carisma: 10,
    },
    hp: { current: 11, max: 11 },
    ac: 18,
    skills: [
      { name: "Medicina", proficient: true },
      { name: "Perspicacia", proficient: true },
      { name: "Religión", proficient: false },
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
