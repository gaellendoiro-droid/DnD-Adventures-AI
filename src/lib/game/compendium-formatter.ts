
export function formatCompendiumEntry(type: string, data: any, query: string): string {
  let displayContent = '';
  const safeData = data || {};

  // --- SHARED STYLES ---
  // Strict consistency enforcement
  const s = {
    cardContainer: "w-full max-w-2xl mx-auto rounded-lg shadow-xl overflow-hidden border font-sans text-left my-2",
    cardInlineStyle: "max-width: 650px; margin: 0.5rem auto;",

    // Typography - Headers
    headerTitle: "font-serif font-bold text-2xl leading-none tracking-wide drop-shadow-sm capitalize", // Unified: Serif, Bold, 2xl, Capitalize (not Uppercase)
    headerSubtitle: "text-xs italic mt-1 font-serif opacity-90", // Unified: Serif, Italic (consistently)

    // Typography - Body
    sectionTitle: "font-serif font-bold text-base mb-2 flex items-center gap-2",
    bodyText: "text-sm text-slate-300 leading-relaxed",
    label: "font-bold text-slate-200",
    value: "text-slate-400"
  };

  // --- MONSTER DESIGN (Red/Danger Theme) ---
  if (type === 'monster') {
    const e = safeData;
    const stats = e.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const mods = e.modifiers || {};

    // Safety Parsers
    const parseStat = (val: any) => {
      if (typeof val === 'number') return val;
      const parsed = parseInt(String(val).match(/\d+/)?.[0] || '10');
      return isNaN(parsed) ? 10 : parsed;
    };
    const getMod = (statValue: any, statName: string) => {
      if (mods[statName] !== undefined && mods[statName] !== null) {
        const val = Number(mods[statName]);
        return !isNaN(val) ? (val >= 0 ? `+${val}` : `${val}`) : '+0';
      }
      const num = parseStat(statValue);
      const val = Math.floor((num - 10) / 2);
      return val >= 0 ? `+${val}` : `${val}`;
    };

    const renderStatCard = (label: string, value: any, key: string) => `
            <div class="flex flex-col items-center justify-center p-2 bg-slate-900/80 rounded border border-red-900/30 w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                <span class="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">${label}</span>
                <span class="text-sm sm:text-base font-bold text-red-500">${getMod(value, key)}</span>
                <span class="text-[10px] text-slate-500 font-mono bg-slate-950 px-1 rounded mt-0.5">${parseStat(value)}</span>
            </div>`;

    // Render sections
    const renderSection = (title: string, items: any[], icon: string, colorClass: string) => {
      if (!items || items.length === 0) return '';
      return `
            <div class="mt-4 pt-2 border-t border-red-900/20">
                <h4 class="${s.sectionTitle} ${colorClass}">
                    ${icon} ${title}
                </h4>
                <div class="space-y-2">
                    ${items.map((i: any) => `
                        <div class="text-sm">
                            <strong class="${s.label}">${i.name}</strong> <span class="${s.value}">${i.desc}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    };

    displayContent = `
        <div class="${s.cardContainer} bg-slate-900 border-red-700/50 text-slate-300" style="${s.cardInlineStyle}">
            <!-- Header (Solid Red) -->
            <div class="bg-red-950 p-4 border-b border-red-700 flex justify-between items-start">
                <div>
                    <h3 class="${s.headerTitle} text-red-100">${e.name}</h3>
                    <p class="${s.headerSubtitle} text-red-200">
                        ${e.size || 'Mediano'} ${e.type}${e.alignment ? `, ${e.alignment}` : ''}
                    </p>
                </div>
                <div class="text-center bg-red-900/50 px-2 py-1 rounded border border-red-700/50">
                    <div class="text-[10px] text-red-200 font-bold uppercase tracking-widest leading-none mb-0.5">CR</div>
                    <div class="text-lg font-bold text-white leading-none">${e.cr}</div>
                </div>
            </div>

            <div class="p-4 space-y-4">
                <!-- Vitals Row -->
                <div class="grid grid-cols-3 gap-2 text-center text-sm py-2 bg-slate-950/40 rounded border border-slate-800">
                    <div class="flex flex-col"><span class="text-slate-500 text-xs uppercase">Clase de Armadura</span> <strong class="text-slate-200 text-lg">${e.ac}</strong></div>
                    <div class="flex flex-col border-x border-slate-800"><span class="text-red-900 text-xs uppercase font-bold">Puntos de Golpe</span> <strong class="text-red-400 text-lg">${e.hp}</strong></div>
                    <div class="flex flex-col"><span class="text-slate-500 text-xs uppercase">Velocidad</span> <strong class="text-slate-200 text-lg">${e.speed || '30 pies'}</strong></div>
                </div>

                <!-- Ability Scores -->
                 <div class="flex flex-row justify-center sm:justify-between items-center gap-2 sm:gap-2 flex-wrap">
                    ${renderStatCard('FUE', stats.str, 'str')}
                    ${renderStatCard('DES', stats.dex, 'dex')}
                    ${renderStatCard('CON', stats.con, 'con')}
                    ${renderStatCard('INT', stats.int, 'int')}
                    ${renderStatCard('SAB', stats.wis, 'wis')}
                    ${renderStatCard('CAR', stats.cha, 'cha')}
                </div>

                <!-- Passives & Defenses Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 border-t border-red-900/20 pt-2">
                    <!-- Left Column: Skills & Senses -->
                    <div class="space-y-1">
                         ${e.skills ? `<p><strong class="text-slate-500">Habilidades:</strong> ${e.skills}</p>` : ''}
                         ${e.senses ? `<p><strong class="text-slate-500">Sentidos:</strong> ${e.senses}</p>` : ''}
                         ${e.languages ? `<p><strong class="text-slate-500">Idiomas:</strong> ${e.languages}</p>` : ''}
                    </div>
                    
                    <!-- Right Column: Defenses -->
                    <div class="space-y-1">
                         ${e.damageVulnerabilities ? `<p class="text-red-400/80"><strong>Vulnerable:</strong> ${e.damageVulnerabilities}</p>` : '<p><strong class="text-slate-600">Vulnerable:</strong> —</p>'}
                         ${e.damageResistances ? `<p class="text-amber-400/80"><strong>Resistente:</strong> ${e.damageResistances}</p>` : '<p><strong class="text-slate-600">Resistente:</strong> —</p>'}
                         ${e.damageImmunities ? `<p class="text-green-400/80"><strong>Inmune:</strong> ${e.damageImmunities}</p>` : '<p><strong class="text-slate-600">Inmune:</strong> —</p>'}
                         ${e.conditionImmunities ? `<p class="text-green-400/80"><strong>Inm. Condición:</strong> ${e.conditionImmunities}</p>` : '<p><strong class="text-slate-600">Inm. Condición:</strong> —</p>'}
                    </div>
                </div>

                <!-- Features & Actions -->
                ${renderSection('Rasgos', e.features, '✨', 'text-amber-500')}
                ${renderSection('Acciones', e.actions, '⚔️', 'text-red-500')}
                ${renderSection('Reacciones', e.reactions, '⚡', 'text-blue-500')}
                ${renderSection('Acciones Legendarias', e.legendaryActions, '👑', 'text-purple-500')}
            </div>
             <div class="bg-slate-950/50 p-1 text-center border-t border-slate-800">
                <span class="text-[10px] text-slate-600">Fuente: ${data.source === 'ai' ? '🤖 Análisis IA' : '💾 Base de Datos'}</span>
             </div>
        </div>`;
  }

  // --- SPELL DESIGN (Blue/Magic Theme) ---
  else if (type === 'spell') {
    const item = safeData; // Renaming to avoid confusion
    displayContent = `
        <div class="${s.cardContainer} bg-slate-900 border-blue-700/50 text-slate-300 relative" style="${s.cardInlineStyle}">
             <!-- Header (Solid Blue) -->
             <div class="p-4 border-b border-blue-700 bg-blue-950 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <!-- Consistent Title/Subtitle -->
                <h3 class="${s.headerTitle} text-blue-100 relative z-10">${item.name}</h3>
                <p class="${s.headerSubtitle} text-blue-200 relative z-10">
                    Nivel ${item.level} ${item.school}
                </p>
             </div>

             <div class="p-4">
                <div class="grid grid-cols-2 gap-y-2 text-xs mb-4 p-2 bg-slate-950/50 rounded border border-blue-900/30">
                    <div><span class="text-blue-500/80 font-bold uppercase tracking-wider text-[10px]">Tiempo</span> <br> <span class="text-slate-200">${item.castingTime}</span></div>
                    <div><span class="text-blue-500/80 font-bold uppercase tracking-wider text-[10px]">Alcance</span> <br> <span class="text-slate-200">${item.range}</span></div>
                    <div><span class="text-blue-500/80 font-bold uppercase tracking-wider text-[10px]">Comp.</span> <br> <span class="text-slate-200">${item.components}</span></div>
                    <div><span class="text-blue-500/80 font-bold uppercase tracking-wider text-[10px]">Duración</span> <br> <span class="text-slate-200">${item.duration}</span></div>
                </div>

                <div class="${s.bodyText} prose-sm prose-invert max-w-none">
                    ${item.description}
                </div>
             </div>
        </div>`;
  }

  // --- ITEM DESIGN (Gold/Loot Theme) ---
  else if (type === 'item') {
    const i = safeData;
    displayContent = `
         <div class="${s.cardContainer} bg-slate-900 border-yellow-600/60 text-stone-300" style="${s.cardInlineStyle}">
            <!-- Header (Solid Gold) -->
            <div class="p-4 border-b border-yellow-600 bg-yellow-950 flex justify-between items-start">
               <div>
                    <!-- Consistent Title -->
                    <h3 class="${s.headerTitle} text-yellow-100 flex items-center gap-2">
                       📦 ${i.name}
                    </h3>
                    <!-- Consistent Subtitle -->
                    <div class="flex items-center gap-3 mt-1">
                         <p class="${s.headerSubtitle} text-yellow-200 m-0">
                            ${i.type}
                         </p>
                         ${(i.rarity && i.rarity !== 'null') ? `<span class="text-[10px] bg-black/30 text-yellow-200 border border-yellow-500/30 px-2 py-0 rounded-full uppercase tracking-wider font-bold">${i.rarity}</span>` : ''}
                    </div>
               </div>
            </div>
            
            <div class="p-4">
                <div class="flex justify-between items-center text-xs text-slate-500 mb-3 italic">
                    <div class="flex gap-3">
                         ${(i.weight && i.weight !== 'null') ? `<span>⚖️ ${i.weight}</span>` : ''}
                         ${(i.price && i.price !== 'null') ? `<span class="text-yellow-500 font-bold">💰 ${i.price}</span>` : ''}
                    </div>
                </div>

                <div class="${s.bodyText} mb-4">
                     ${(i.description && i.description !== 'null') ? i.description : ''}
                </div>

                ${i.mechanics ? (() => {
        try {
          const m = typeof i.mechanics === 'string' ? JSON.parse(i.mechanics) : i.mechanics;
          let mechHtml = '';
          if (m.damage) mechHtml += `<div><strong class="text-red-400">Daño:</strong> ${m.damage}</div>`;
          if (m.ac) mechHtml += `<div><strong class="text-blue-400">CA:</strong> ${m.ac}</div>`;
          if (m.properties && Array.isArray(m.properties)) mechHtml += `<div><strong class="text-slate-400">Props:</strong> ${m.properties.join(', ')}</div>`;

          return mechHtml ? `
                         <div class="bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-400 grid grid-cols-2 gap-2">
                            ${mechHtml}
                         </div>` : '';
        } catch (e) { return ''; }
      })() : ''}
            </div>
         </div>`;
  }

  // --- RULE/FALLBACK ---
  else {
    displayContent = `
            <div class="${s.cardContainer} bg-slate-900 p-4 border-slate-700/50" style="${s.cardInlineStyle}">
                <h3 class="font-bold text-slate-200 mb-2 capitalize">📜 ${query}</h3>
                <div class="text-sm text-slate-400 whitespace-pre-wrap">${safeData.text || JSON.stringify(safeData, null, 2)}</div>
            </div>`;
  }

  return displayContent;
}

export function formatNotFoundMessage(query: string): string {
  return `
        <div class="w-full md:w-3/4 mx-auto bg-slate-900 border border-red-900/30 rounded-lg p-4 flex items-center gap-4 shadow-lg" style="max-width: 650px; margin: 0.5rem auto;">
           <div class="text-3xl grayscale opacity-50">🤷‍♂️</div>
           <div>
             <h3 class="font-bold text-slate-400 text-sm">Sin resultados</h3>
             <p class="text-xs text-slate-600 italic mt-1">El tomo está vacío en la página de "<strong>${query}</strong>".</p>
           </div>
        </div>`;
}
