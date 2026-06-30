
import { ai } from '../src/ai/genkit';
import { z } from 'genkit';

// Mock Tool
const updateAttitudeTool = ai.defineTool(
    {
        name: 'updateAttitude',
        description: 'Updates the attitude of the NPC towards the player.',
        inputSchema: z.object({
            attitude: z.enum(['improved', 'worsened']),
            reason: z.string()
        }),
        outputSchema: z.string(),
    },
    async (input) => {
        return `Attitude updated to ${input.attitude}`;
    }
);

// Prompt without JSON Schema output (Text mode)
const textPrompt = ai.definePrompt({
    name: 'testTextStream',
    tools: [updateAttitudeTool],
    input: { schema: z.object({ input: z.string() }) },
    prompt: `You are an NPC. Reply to: {{input}}. 
    If I say "compliment", call the updateAttitude tool with "improved".
    Reply with text directly.`
});

async function main() {
    console.log("Testing Stream...");
    const response = await textPrompt.generateStream({ input: "I give you a compliment." });

    for await (const chunk of response.stream) {
        console.log("Chunk:", JSON.stringify(chunk));
        if (chunk.content) {
            process.stdout.write(chunk.content.map(c => c.text).join(''));
        }
    }
    console.log("\nStream Done.");

    const final = await response.response;
    console.log("Final Output:", final.output);
    console.log("Tool Calls:", final.toolCalls);
}

main().catch(console.error);
