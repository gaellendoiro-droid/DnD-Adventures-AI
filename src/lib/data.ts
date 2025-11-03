import type { Character, GameMessage } from "./types";
import { PlaceHolderImages } from "./placeholder-images";

const character1Image = PlaceHolderImages.find(img => img.id === 'character-1');
const character2Image = PlaceHolderImages.find(img => img.id === 'character-2');
const character3Image = PlaceHolderImages.find(img => img.id === 'character-3');
const character4Image = PlaceHolderImages.find(img => img.id === 'character-4');

export const initialParty: Character[] = [
  {
    id: "1",
    name: "Aelar",
    race: "Elfo",
    class: "Guerrero",
    level: 1,
    avatarUrl: character1Image?.imageUrl ?? '',
    avatarHint: character1Image?.imageHint ?? 'fantasy warrior',
    abilityScores: {
      fuerza: 16,
      destreza: 14,
      constitución: 15,
      inteligencia: 10,
      sabiduría: 12,
      carisma: 8,
    },
    hp: { current: 12, max: 12 },
    skills: [
      { name: "Acrobacias", proficient: true },
      { name: "Atletismo", proficient: true },
      { name: "Percepción", proficient: false },
    ],
  },
  {
    id: "2",
    name: "Lyra",
    race: "Humana",
    class: "Maga",
    level: 1,
    avatarUrl: character2Image?.imageUrl ?? '',
    avatarHint: character2Image?.imageHint ?? 'fantasy wizard',
    abilityScores: {
      fuerza: 8,
      destreza: 14,
      constitución: 13,
      inteligencia: 17,
      sabiduría: 12,
      carisma: 10,
    },
    hp: { current: 8, max: 8 },
    skills: [
      { name: "Arcano", proficient: true },
      { name: "Historia", proficient: true },
      { name: "Investigación", proficient: false },
    ],
  },
  {
    id: "3",
    name: "Kaelen",
    race: "Mediano",
    class: "Pícaro",
    level: 1,
    avatarUrl: character3Image?.imageUrl ?? '',
    avatarHint: character3Image?.imageHint ?? 'fantasy rogue',
    abilityScores: {
      fuerza: 10,
      destreza: 17,
      constitución: 12,
      inteligencia: 14,
      sabiduría: 8,
      carisma: 13,
    },
    hp: { current: 9, max: 9 },
    skills: [
      { name: "Engaño", proficient: true },
      { name: "Juego de Manos", proficient: false },
      { name: "Sigilo", proficient: true },
    ],
  },
  {
    id: "4",
    name: "Bror",
    race: "Enano",
    class: "Clérigo",
    level: 1,
    avatarUrl: character4Image?.imageUrl ?? '',
    avatarHint: character4Image?.imageHint ?? 'fantasy cleric',
    abilityScores: {
      fuerza: 15,
      destreza: 8,
      constitución: 16,
      inteligencia: 10,
      sabiduría: 16,
      carisma: 10,
    },
    hp: { current: 11, max: 11 },
    skills: [
      { name: "Medicina", proficient: true },
      { name: "Perspicacia", proficient: true },
      { name: "Religión", proficient: false },
    ],
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
