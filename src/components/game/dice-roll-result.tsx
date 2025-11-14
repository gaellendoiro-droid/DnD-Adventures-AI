
"use client";

import type { DiceRoll } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiceRollResultProps {
  roll: DiceRoll;
  rollNumber: number;
}

const outcomeStyles: { [key in DiceRoll['outcome'] | 'damage'] : string } = {
  crit: "border-4 border-yellow-400 bg-gradient-to-br from-yellow-500/20 via-green-500/15 to-yellow-500/20 shadow-lg shadow-yellow-500/50 animate-pulse",
  success: "border-green-500 bg-green-500/10",
  fail: "border-red-500 bg-red-500/10",
  pifia: "border-4 border-red-600 bg-gradient-to-br from-red-600/30 via-red-700/20 to-red-800/30 shadow-lg shadow-red-600/50",
  neutral: "border-border",
  initiative: "border-blue-500 bg-blue-500/10",
  damage: "border-yellow-400 bg-yellow-400/10 text-yellow-200",
};

const outcomeTextStyles: { [key in DiceRoll['outcome'] | 'damage']?: string } = {
    crit: "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
    success: "text-green-400",
    fail: "text-red-400",
    pifia: "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]",
    initiative: "text-blue-400",
    damage: "text-yellow-300",
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

  if (roll.description.toLowerCase().includes('iniciativa')) {
    finalOutcome = 'initiative';
  } else if (isDamageRoll && roll.outcome === 'neutral') {
    finalOutcome = 'damage';
  } else if (isAttackRoll && roll.attackHit !== undefined) {
    // For attack rolls, use attackHit to determine outcome if available
    finalOutcome = roll.attackHit ? (roll.outcome === 'crit' ? 'crit' : 'success') : (roll.outcome === 'pifia' ? 'pifia' : 'fail');
  } else {
    // Use the outcome from the roll
    finalOutcome = roll.outcome;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-lg border text-sm",
        outcomeStyles[finalOutcome]
      )}
    >
      <div className="flex-shrink-0 font-mono text-xs h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground font-bold mt-0.5">
        {rollNumber}
      </div>
      <div className="flex-grow grid grid-cols-[1fr_auto] items-start gap-x-2">
        <div className="text-left">
            <p className="font-semibold leading-tight">
                {roll.roller}
            </p>
            <p className="text-xs font-semibold text-muted-foreground leading-tight">
              {roll.description}
              {roll.rollNotation && (
                <span className="ml-1 text-muted-foreground/70">({roll.rollNotation})</span>
              )}
            </p>
            {/* Show special label for crits and fumbles */}
            {outcomeLabels[finalOutcome] && (
              <p className={cn(
                "text-sm font-black tracking-wide mt-1",
                finalOutcome === 'crit' ? "text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" : "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"
              )}>
                {outcomeLabels[finalOutcome]}
              </p>
            )}
            {/* Show target information for attack rolls */}
            {isAttackRoll && (
              <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">
                {roll.targetName ? (
                  <>
                    Contra: <span className="font-semibold">{roll.targetName}</span>
                    {roll.targetAC !== undefined && (
                      <span className="ml-1">(AC {roll.targetAC})</span>
                    )}
                    {roll.attackHit !== undefined && (
                      <span className={cn(
                        "ml-2 font-semibold",
                        roll.attackHit ? "text-green-400" : "text-red-400"
                      )}>
                        {roll.attackHit ? "✓ Acierta" : "✗ Fallo"}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground/60 italic">(Información de combate no disponible)</span>
                )}
              </p>
            )}
            {/* Show target information for damage rolls */}
            {isDamageRoll && roll.targetName && roll.damageDealt !== undefined && (
              <>
                {isSavingThrowSpell ? (
                  <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">
                    <span className="font-semibold">{roll.targetName}</span> sufre <span className="font-semibold text-yellow-300">{roll.damageDealt}</span> puntos de daño {descLower.includes('radiante') || descLower.includes('radiant') ? 'radiante' : ''}
                    <span className="ml-1 italic text-muted-foreground/60">(hechizo de salvación)</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">
                    {roll.roller} ha hecho <span className="font-semibold text-yellow-300">{roll.damageDealt}</span> puntos de daño a <span className="font-semibold">{roll.targetName}</span>
                  </p>
                )}
                {/* Show death message if target was killed */}
                {roll.targetKilled && (
                  <p className="text-xs font-bold text-red-400 leading-tight mt-1">
                    💀 ¡{roll.roller} ha matado a {roll.targetName}!
                  </p>
                )}
              </>
            )}
            {/* Show target information for healing rolls */}
            {isHealingRoll && roll.targetName && roll.healingAmount !== undefined && (
              <p className="text-xs text-muted-foreground/80 leading-tight mt-0.5">
                {roll.roller} ha curado <span className="font-semibold text-green-300">{roll.healingAmount}</span> puntos de vida a <span className="font-semibold">{roll.targetName}</span>
              </p>
            )}
        </div>
        <div className="text-right">
            <p className={cn(
                "text-2xl font-bold font-mono leading-none",
                outcomeTextStyles[finalOutcome]
            )}>
                {totalResult}
            </p>
            {showBreakdown ? (
                <p className="text-xs font-mono text-muted-foreground text-right leading-tight">
                    ({roll.individualRolls.join('+')})
                    {roll.modifier !== undefined ? (roll.modifier >= 0 ? `+${roll.modifier}`: `${roll.modifier}`) : ''}
                </p>
            ) : null}
        </div>
      </div>
    </div>
  );
}
