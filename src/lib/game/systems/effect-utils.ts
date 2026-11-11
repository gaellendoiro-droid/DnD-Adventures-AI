import type { CharacterEffect } from '@/lib/types';

const EFFECT_CATALOG: Record<string, Omit<CharacterEffect, 'id'>> = {
  speak_with_animals: {
    name: 'Hablar con los Animales',
    description: 'Puedes comprender y comunicarte verbalmente con las bestias.',
    type: 'buff',
    source: 'Conjuro / Pergamino',
    duration: '10 min',
  },
  detect_magic: {
    name: 'Detectar Magia',
    description: 'Percibes la presencia de cualquier aura mágica a 30 pies de ti.',
    type: 'buff',
    source: 'Conjuro / Pergamino',
    duration: '10 min',
  },
  comprehend_languages: {
    name: 'Comprender Idiomas',
    description: 'Entiendes el significado literal de cualquier idioma hablado o escrito.',
    type: 'buff',
    source: 'Conjuro / Pergamino',
    duration: '1 hora',
  },
  blessed: {
    name: 'Bendición',
    description: 'Añades +1d4 a las tiradas de ataque y de salvación.',
    type: 'buff',
    source: 'Conjuro',
    duration: '1 min',
  },
  poisoned: {
    name: 'Envenenado',
    description: 'Desventaja en tiradas de ataque y pruebas de característica.',
    type: 'debuff',
    source: 'Condición',
  },
  frightened: {
    name: 'Asustado',
    description: 'Desventaja en pruebas de característica y ataques mientras veas la fuente de tu miedo.',
    type: 'condition',
    source: 'Condición',
  },
};

/**
 * Construye un objeto CharacterEffect estandarizado a partir de un identificador de efecto.
 */
export function buildCharacterEffect(effectId: string, customSource?: string): CharacterEffect {
  const normalized = effectId.trim().toLowerCase();
  const entry = EFFECT_CATALOG[normalized];
  if (entry) {
    return {
      id: normalized,
      ...entry,
      source: customSource || entry.source,
    };
  }

  const readableName = normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    id: normalized,
    name: readableName,
    description: `Efecto o condición activa (${readableName}).`,
    type: 'buff',
    source: customSource,
  };
}

/**
 * Añade (si no existe ya) un estado o efecto activo al personaje indicado dentro del grupo.
 */
export function addEffectToCharacterInParty(
  party: any[],
  characterNameOrId: string,
  effectId: string,
  customSource?: string
): any[] {
  const effectObj = buildCharacterEffect(effectId, customSource);
  for (const member of party) {
    const matchById =
      member.id &&
      characterNameOrId &&
      String(member.id).trim().toLowerCase() === String(characterNameOrId).trim().toLowerCase();
    const matchByName =
      member.name &&
      characterNameOrId &&
      String(member.name).trim().toLowerCase() === String(characterNameOrId).trim().toLowerCase();

    if (matchById || matchByName) {
      if (!Array.isArray(member.activeEffects)) {
        member.activeEffects = [];
      }
      const alreadyHas = member.activeEffects.some((ef: any) => ef.id === effectObj.id);
      if (!alreadyHas) {
        member.activeEffects.push(effectObj);
      }
      break;
    }
  }
  return party;
}

/**
 * Determina si una flag de globalFlags corresponde a un efecto mágico o condición real
 * (excluyendo banderas técnicas internas como took_scroll_*, identified_scroll_*, consumed_scroll_*, etc.).
 */
export function isActiveMagicalOrStatusFlag(flagKey: string): boolean {
  if (!flagKey) return false;
  if (
    flagKey.startsWith('took_scroll_') ||
    flagKey.startsWith('identified_scroll_') ||
    flagKey.startsWith('consumed_scroll_') ||
    flagKey.startsWith('__')
  ) {
    return false;
  }
  return true;
}
