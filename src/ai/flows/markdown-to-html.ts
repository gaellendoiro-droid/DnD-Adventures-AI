'use server';
/**
 * @fileOverview Converts Markdown text to HTML.
 *
 * - markdownToHtml - A function that converts Markdown to HTML.
 * - MarkdownToHtmlInput - The input type for the markdownToHtml function.
 * - MarkdownToHtmlOutput - The return type for the markdownToHtml function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarkdownToHtmlInputSchema = z.object({
  markdown: z.string().describe('The Markdown text to convert.'),
});
export type MarkdownToHtmlInput = z.infer<typeof MarkdownToHtmlInputSchema>;

const MarkdownToHtmlOutputSchema = z.object({
  html: z.string().describe('The converted HTML.'),
});
export type MarkdownToHtmlOutput = z.infer<typeof MarkdownToHtmlOutputSchema>;

export async function markdownToHtml(
  input: MarkdownToHtmlInput
): Promise<MarkdownToHtmlOutput> {
  return markdownToHtmlFlow(input);
}

const prompt = ai.definePrompt({
  name: 'markdownToHtmlPrompt',
  input: { schema: MarkdownToHtmlInputSchema },
  output: { schema: MarkdownToHtmlOutputSchema },
  prompt: `Convert the following Markdown text to HTML. Do not add any extra elements like <html> or <body> tags.

Markdown:
"{{{markdown}}}"

HTML:`,
});

const markdownToHtmlFlow = ai.defineFlow(
  {
    name: 'markdownToHtmlFlow',
    inputSchema: MarkdownToHtmlInputSchema,
    outputSchema: MarkdownToHtmlOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
