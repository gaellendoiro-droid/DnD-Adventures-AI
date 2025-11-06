import { config } from 'dotenv';
config();

import '@/ai/flows/parse-adventure-from-json.ts';
import '@/ai/flows/generate-monster-encounters.ts';
import '@/ai/flows/narrative-expert.ts';
import '@/ai/flows/enemy-tactician.ts';
import '@/ai/flows/companion-expert.ts';
import '@/ai/flows/ooc-assistant.ts';
import '@/ai/flows/generate-dm-narration-audio.ts';
import '@/ai/flows/markdown-to-html.ts';
import '@/ai/tools/dnd-api-lookup.ts';
import '@/ai/tools/adventure-lookup.ts';
