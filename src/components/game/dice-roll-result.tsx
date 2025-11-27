
"use client";

import React from 'react';
import type { DiceRoll } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiceRollResultProps {
  roll: DiceRoll;
  rollNumber: number;
}

const outcomeStyles: { [key in DiceRoll['outcome'] | 'damage']: string } = {
  crit: "border-4 border-yellow-400 bg-gradient-to-br from-yellow-500/20 via-green-500/15 to-yellow-500/20 shadow-lg shadow-yellow-500/50 animate-pulse",
  success: "border-green-500 bg-green-500/10",
  fail: "border-red-500 bg-red-500/10",
  pifia: "border-4 border-red-600 bg-gradient-to-br from-red-600/30 via-red-700/20 to-red-800/30 shadow-lg shadow-red-600/50",
  neutral: "border-border",
  initiative: "border-blue-500 bg-blue-500/10",
  damage: "border-yellow-400 bg-yellow-400/10 text-yellow-200",
  victory: "border-4 border-green-400 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-green-600/30 shadow-lg shadow-green-500/50 animate-pulse",
  defeat: "border-4 border-red-500 bg-gradient-to-br from-red-600/30 via-red-700/20 to-red-800/30 shadow-lg shadow-red-600/50 animate-pulse",
};

const outcomeTextStyles: { [key in DiceRoll['outcome'] | 'damage']?: string } = {
  crit: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
  success: "text-green-400",
  fail: "text-red-400",
  pifia: "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]",
  initiative: "text-blue-400",
  damage: "text-yellow-300",
  victory: "text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]",
  defeat: "text-red-400 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]",
}

// Helper function to get critical styles based on roll type
const getCriticalStyles = (isAttackRoll: boolean, isDamageRoll: boolean) => {
  if (isAttackRoll) {
    // Attack critical: green with pulse
    return {
      container: "border-4 border-green-400 bg-gradient-to-br from-green-500/20 via-green-500/15 to-green-500/20 shadow-lg shadow-green-500/50 animate-pulse",
      text: "text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]",
      label: "text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]",
    };
  } else if (isDamageRoll) {
    // Damage critical: yellow with pulse
    return {
      container: "border-4 border-yellow-400 bg-gradient-to-br from-yellow-500/20 via-yellow-500/15 to-yellow-500/20 shadow-lg shadow-yellow-500/50 animate-pulse",
      text: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
      label: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
    };
  }
  // Fallback to default yellow for other criticals
  return {
    container: "border-4 border-yellow-400 bg-gradient-to-br from-yellow-500/20 via-green-500/15 to-yellow-500/20 shadow-lg shadow-yellow-500/50 animate-pulse",
    text: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
    label: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
  };
}

const outcomeLabels: { [key in DiceRoll['outcome'] | 'damage']?: string } = {
  crit: "⭐ ¡CRÍTICO!",
  pifia: "☠️ ¡PIFIA!",
}

export function DiceRollResult({ roll, rollNumber }: DiceRollResultProps) {
  const totalResult = roll.totalResult;
  // Always show the breakdown for maximum clarity, as requested.
  const showBreakdown = true;

  // Determine if this is an attack roll
  const isAttackRoll = roll.description?.toLowerCase().includes('ataque') || roll.description?.toLowerCase().includes('attack');
  const isDamageRoll = roll.description?.toLowerCase().includes('daño') || roll.description?.toLowerCase().includes('damage');
  const isHealingRoll = roll.description?.toLowerCase().includes('curación') || roll.description?.toLowerCase().includes('healing') || roll.description?.toLowerCase().includes('cura');

  // Detect saving throw spells (damage without attack roll)
  const descLower = roll.description?.toLowerCase() || '';
  const isSavingThrowSpell = isDamageRoll && !isAttackRoll && (
    descLower.includes('radiante') ||
    descLower.includes('radiant') ||
    descLower.includes('sagrada') ||
    descLower.includes('sacred') ||
    descLower.includes('llama sagrada') ||
    descLower.includes('sacred flame') ||
    descLower.includes('salvación') ||
    descLower.includes('saving')
  );

  let finalOutcome: DiceRoll['outcome'] | 'damage';

  // Check for victory/defeat outcomes first (special combat end messages)
  if (roll.outcome === 'victory' || roll.outcome === 'defeat') {
    finalOutcome = roll.outcome;
  } else if (roll.description.toLowerCase().includes('iniciativa')) {
    finalOutcome = 'initiative';
  } else if (isDamageRoll) {
    // For damage rolls, check if it's critical (either by outcome or description)
    const isCriticalDamage = roll.outcome === 'crit' ||
      roll.description?.toLowerCase().includes('(crítico)') ||
      roll.description?.toLowerCase().includes('(critico)');
    if (isCriticalDamage) {
      finalOutcome = 'crit';
    } else if (roll.outcome === 'neutral') {
      finalOutcome = 'damage';
    } else {
      // Use the outcome from the roll (could be success, fail, etc.)
      finalOutcome = roll.outcome;
    }
  } else if (isAttackRoll && roll.attackHit !== undefined) {
    // For attack rolls, use attackHit to determine outcome if available
    finalOutcome = roll.attackHit ? (roll.outcome === 'crit' ? 'crit' : 'success') : (roll.outcome === 'pifia' ? 'pifia' : 'fail');
  } else {
    // Use the outcome from the roll
    finalOutcome = roll.outcome;
  }

  // Get critical styles if this is a critical roll
  const criticalStyles = finalOutcome === 'crit' ? getCriticalStyles(isAttackRoll, isDamageRoll) : null;
  const containerStyle = criticalStyles ? criticalStyles.container : outcomeStyles[finalOutcome];

  // Special handling for victory/defeat messages
  const isCombatEndMessage = finalOutcome === 'victory' || finalOutcome === 'defeat';

  return (
    <div
      className={cn(
        "flex items-start gap-1.5 p-1.5 rounded-lg border text-xs",
        containerStyle
      )}
    >
      {!isCombatEndMessage && (
        <div className="flex-shrink-0 font-mono text-[10px] h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold mt-0.5">
          {rollNumber}
        </div>
      )}
      <div className={cn("flex-grow", isCombatEndMessage ? "grid grid-cols-1" : "grid grid-cols-[1fr_auto] items-start gap-x-1.5")}>
        <div className="text-left">
          {isCombatEndMessage ? (
            <div className="text-center">
              <p className={cn(
                "text-base font-bold tracking-wide",
                finalOutcome === 'victory'
                  ? "text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]"
                  : "text-red-400 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"
              )}>
                {finalOutcome === 'victory' ? '🎉 ¡VICTORIA! 🎉' : '💀 ¡DERROTA! 💀'}
              </p>
              <p className={cn(
                "text-xs font-semibold mt-1",
                finalOutcome === 'victory' ? "text-green-200" : "text-red-300"
              )}>
                {roll.description || 'El combate ha finalizado.'}
              </p>
            </div>
          ) : (
            <>
              <p className="font-semibold text-sm leading-tight">
                {roll.roller}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground leading-tight">
                {roll.description}
                {roll.rollNotation && (
                  <span className="ml-1 text-muted-foreground/70">({roll.rollNotation})</span>
                )}
              </p>
            </>
          )}
          {/* Show special label for crits and fumbles */}
          {outcomeLabels[finalOutcome] && (
            <p className={cn(
              "text-xs font-black tracking-wide mt-0.5",
              finalOutcome === 'crit'
                ? (criticalStyles ? criticalStyles.label : "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]")
                : "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"
            )}>
              {outcomeLabels[finalOutcome]}
            </p>
          )}
          {/* Show target information for attack rolls */}
          {isAttackRoll && (
            <>
              {roll.attackRange && (
                <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
                  {roll.attackRange === 'ranged' ? '🏹 A distancia' : '⚔️ Cuerpo a cuerpo'}
                </p>
              )}
              {roll.targetName ? (
                <>
                  <p className="text-[10px] text-muted-foreground/80 leading-tight mt-0.5">
                    Contra: <span className="font-semibold">{roll.targetName}</span>
                    {roll.targetAC !== undefined && (
                      <span className="ml-1">(AC {roll.targetAC})</span>
                    )}
                  </p>
                  {roll.attackHit !== undefined && (
                    <p className={cn(
                      "text-[10px] font-semibold leading-tight mt-0.5",
                      roll.attackHit ? "text-green-400" : "text-red-400"
                    )}>
                      {roll.attackHit ? "✓ Acierta" : "✗ Fallo"}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground/60 italic leading-tight mt-0.5">
                  (Información de combate no disponible)
                </p>
              )}
            </>
          )}
          {/* Show target information for damage rolls */}
          {isDamageRoll && roll.targetName && roll.damageDealt !== undefined && (
            <>
              {isSavingThrowSpell ? (
                <p className="text-[10px] text-muted-foreground/80 leading-tight mt-0.5">
                  <span className="font-semibold">{roll.targetName}</span> sufre <span className="font-semibold text-yellow-300">{roll.damageDealt}</span> puntos de daño {descLower.includes('radiante') || descLower.includes('radiant') ? 'radiante' : ''}
                  <span className="ml-1 italic text-muted-foreground/60">(hechizo de salvación)</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/80 leading-tight mt-0.5">
                  {roll.roller} ha hecho <span className="font-semibold text-yellow-300">{roll.damageDealt}</span> puntos de daño a <span className="font-semibold">{roll.targetName}</span>
                </p>
              )}
              {/* Show death message if target was killed */}
              {roll.targetKilled && (
                <p className="text-[10px] font-bold text-red-400 leading-tight mt-0.5">
                  💀 ¡{roll.roller} ha matado a {roll.targetName}!
                </p>
              )}
              {/* Show unconscious message if target was knocked out */}
              {roll.targetKnockedOut && (
                <p className="text-[10px] font-bold text-orange-400 leading-tight mt-0.5">
                  😴 ¡{roll.roller} ha dejado inconsciente a {roll.targetName}!
                </p>
              )}
            </>
          )}
          {/* Show target information for healing rolls */}
          {isHealingRoll && roll.targetName && roll.healingAmount !== undefined && (
            <p className="text-[10px] text-muted-foreground/80 leading-tight mt-0.5">
              {roll.roller} ha curado <span className="font-semibold text-green-300">{roll.healingAmount}</span> puntos de vida a <span className="font-semibold">{roll.targetName}</span>
            </p>
          )}
        </div>
        {!isCombatEndMessage && (
          <div className="text-right">
            <p className={cn(
              "text-xl font-bold font-mono leading-none",
              finalOutcome === 'crit' && criticalStyles
                ? criticalStyles.text
                : outcomeTextStyles[finalOutcome]
            )}>
              {totalResult}
            </p>
            {showBreakdown ? (
              <p className="text-[10px] font-mono text-muted-foreground text-right leading-tight">
                {roll.modifiers && roll.modifiers.length > 0 ? (
                  // Show individual dice rolls + modifiers (e.g., "1+2+3" for 2d4+3 with rolls [1,2] and modifier 3)
                  `${roll.individualRolls.join('+')}${roll.modifiers.map(mod => mod.value >= 0 ? `+${mod.value}` : `${mod.value}`).join('')}`
                ) : (
                  // Fallback: use same format without spaces for consistency
                  (() => {
                    // Show individual dice rolls if multiple, or just the sum if single die
                    const diceDisplay = roll.individualRolls.length > 1
                      ? roll.individualRolls.join('+')
                      : roll.individualRolls[0]?.toString() || '0';
                    const modifierStr = roll.modifier !== undefined
                      ? (roll.modifier >= 0 ? `+${roll.modifier}` : `${roll.modifier}`)
                      : '';
                    return `${diceDisplay}${modifierStr}`;
                  })()
                )}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
