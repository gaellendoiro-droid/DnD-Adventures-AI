"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { RollMode } from '@/lib/types';

interface VisualDicePairProps {
    die1: number;
    die2?: number;
    kept: number;
    discarded?: number;
    mode: RollMode;
    modifier?: number;
    total?: number;
}

/**
 * Componente visual para mostrar un par de dados de d20 cuando hay
 * Ventaja (se mantiene el mayor) o Desventaja (se mantiene el menor).
 * 
 * Muestra ambos dados con el mantenido destacado y el descartado tachado/atenuado.
 */
export function VisualDicePair({ die1, die2, kept, discarded, mode, modifier, total }: VisualDicePairProps) {
    const isAdvantage = mode === 'advantage';
    const isDisadvantage = mode === 'disadvantage';
    const isNormal = mode === 'normal';

    // Estilos condicionales para ventaja/desventaja
    const keptStyles = isAdvantage
        ? "text-green-400 border-green-500 bg-green-500/20 ring-2 ring-green-400/50"
        : isDisadvantage
            ? "text-red-400 border-red-500 bg-red-500/20 ring-2 ring-red-400/50"
            : "text-foreground border-border bg-muted/50";

    const discardedStyles = "text-muted-foreground/50 border-muted-foreground/30 bg-muted/10 line-through opacity-60";

    // Determinar cuál dado es cuál
    const die1IsKept = die1 === kept;
    const die2IsKept = die2 === kept;

    // Si es tirada normal, solo mostramos un dado
    if (isNormal || die2 === undefined) {
        return (
            <div className="flex items-center gap-1.5">
                <div className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-md border-2 font-mono font-bold text-sm",
                    kept === 20 ? "text-yellow-400 border-yellow-500 bg-yellow-500/20 animate-pulse" :
                        kept === 1 ? "text-red-500 border-red-600 bg-red-600/20" :
                            "text-foreground border-border bg-muted/50"
                )}>
                    {kept}
                </div>
                {modifier !== undefined && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                        {modifier >= 0 ? `+${modifier}` : modifier}
                    </span>
                )}
                {total !== undefined && (
                    <span className="text-sm font-bold font-mono">= {total}</span>
                )}
            </div>
        );
    }

    // Mostrar par de dados con ventaja/desventaja
    return (
        <div className="flex items-center gap-1">
            {/* Etiqueta de modo */}
            <span className={cn(
                "text-[9px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded",
                isAdvantage ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
                {isAdvantage ? "VNT" : "DVT"}
            </span>

            {/* Primer dado */}
            <div className={cn(
                "w-6 h-6 flex items-center justify-center rounded border-2 font-mono font-bold text-xs transition-all",
                die1IsKept ? keptStyles : discardedStyles
            )}>
                {die1}
            </div>

            {/* Segundo dado */}
            <div className={cn(
                "w-6 h-6 flex items-center justify-center rounded border-2 font-mono font-bold text-xs transition-all",
                die2IsKept ? keptStyles : discardedStyles
            )}>
                {die2}
            </div>

            {/* Separador visual */}
            <span className="text-muted-foreground/50 text-xs">→</span>

            {/* Resultado mantenido (destacado) */}
            <div className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md border-2 font-mono font-bold text-sm",
                kept === 20 ? "text-yellow-400 border-yellow-500 bg-yellow-500/20 animate-pulse shadow-lg shadow-yellow-500/30" :
                    kept === 1 ? "text-red-500 border-red-600 bg-red-600/20 shadow-lg shadow-red-600/30" :
                        keptStyles
            )}>
                {kept}
            </div>

            {/* Modificador y total */}
            {modifier !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground">
                    {modifier >= 0 ? `+${modifier}` : modifier}
                </span>
            )}
            {total !== undefined && (
                <span className="text-sm font-bold font-mono">= {total}</span>
            )}
        </div>
    );
}
