import { config } from 'dotenv';
config();

import '@/ai/flows/parse-adventure-from-json.ts';
import '@/ai/flows/generate-monster-encounters.ts';
import '@/ai/flows/generate-dm-narration-audio.ts';
import '@/ai/flows/markdown-to-html.ts';
import '@/ai/flows/game-coordinator.ts'; 

import '@/ai/tools/dnd-api-lookup.ts';
import '@/ai/tools/adventure-lookup.ts';
import '@/ai/tools/narrative-expert.ts';
import '@/ai/tools/ooc-assistant.ts';
import '@/ai/tools/combat-manager.ts';
import '@/ai/tools/companion-expert.ts'; 
import '@/ai/tools/enemy-tactician.ts';
