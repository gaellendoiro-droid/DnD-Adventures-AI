import { config } from 'dotenv';
config();

import '@/ai/flows/parse-adventure-from-json.ts';
import '@/ai/flows/generate-monster-encounters.ts';
import '@/ai/flows/translate-adventure-to-spanish.ts';
import '@/ai/flows/ai-dungeon-master-parser.ts';
import '@/ai/flows/generate-character-action.ts';
import '@/ai/flows/dungeon-master-ooc-parser.ts';
import '@/ai/flows/generate-adventure-intro.ts';
import '@/ai/flows/detect-language.ts';
import '@/ai/flows/generate-dm-narration-audio.ts';
import '@/ai/flows/markdown-to-html.ts';
