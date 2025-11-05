import { config } from 'dotenv';
config();

import '@/ai/flows/parse-adventure-from-json.ts';
import '@/ai/flows/generate-monster-encounters.ts';
import '@/ai/flows/ai-dungeon-master-parser.ts';
import '@/ai/flows/generate-character-action.ts';
import '@/ai/flows/dungeon-master-ooc-parser.ts';
import '@/ai/flows/generate-dm-narration-audio.ts';
import '@/ai/flows/markdown-to-html.ts';
import '@/ai/tools/dnd-api-lookup.ts';
