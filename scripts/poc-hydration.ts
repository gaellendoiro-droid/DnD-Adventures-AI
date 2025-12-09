
import { DataService } from '@/lib/data-service';
import { log } from '@/lib/logger';
import dotenv from 'dotenv';
import { getMonsterStatsFromDndApi } from '@/lib/combat/monster-stats-parser';

// Mock logger
log.info = (msg: string, ctx?: any) => console.log(`[INFO] ${msg}`, ctx || '');
log.error = (msg: string, ctx?: any) => console.error(`[ERROR] ${msg}`, ctx || '');
log.debug = (msg: string, ctx?: any) => { }; // Silence debug

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// scripts/poc-hydration.ts
// Prueba de Concepto (POC) para la Fase 3: Hidratación AI
// Objetivo: Demostrar que si un monstruo no existe en local, se consulta el PDF y se estructura dinámicamente.
//
// Uso: 
// 1. Asegúrate de que el monstruo NO esté en la DB local (borra manualmente si es necesario).
// 2. Ejecuta: npx tsx scripts/poc-hydration.ts
//
// Nota: Usa 'Diablillo' como ejemplo porque está en el Manual (Español)
// pero si ya se ha hidratado, devolverá desde local.

async function testHydration() {
    console.log("💧 Probando Sistema de Hidratación AI (Fase 3)...");

    // 1. Elegimos un monstruo. 'Diablillo' (Imp) está en el apéndice del manual básico
    // Ejemplo: "Diablillo" (Imp) está en el Apéndice D del Manual del Jugador en Español.
    // Esto debería disparar el RAG encontrando el texto en español.
    const targetMonster = "Diablillo";

    console.log(`\n🔍 Buscando: "${targetMonster}"`);
    console.log("   (Debería fallar en Local y disparar RAG+Estructuración)");

    const start = Date.now();
    const stats = await getMonsterStatsFromDndApi(targetMonster);
    const duration = Date.now() - start;

    if (stats) {
        console.log(`\n✅ ¡ÉXITO! Monstruo recuperado en ${(duration / 1000).toFixed(2)}s`);
        console.log("-----------------------------------------");
        console.log(`Nombre: ${targetMonster}`); // El parser devuelve stats, no el nombre del objeto local
        console.log(`HP: ${stats.hp}`);
        console.log(`AC: ${stats.ac}`);
        console.log(`Fuerza: ${stats.abilityScores.fuerza}`);
        console.log(`Acciones: ${stats.actions.length} encontradas`);
        if (stats.actions.length > 0) {
            console.log(` - Acción 1: ${stats.actions[0].name}: ${stats.actions[0].desc?.substring(0, 50)}...`);
        }
        console.log("-----------------------------------------");
    } else {
        console.log("\n❌ Falló la hidratación. El monstruo no pudo ser generado.");
    }
}

testHydration();
