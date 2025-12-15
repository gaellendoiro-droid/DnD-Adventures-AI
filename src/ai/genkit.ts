import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

import { GEMINI_MODEL_NAME } from './model-config';

export const ai = genkit({
  plugins: [googleAI({ apiVersion: 'v1beta' })],
  model: GEMINI_MODEL_NAME,
});
