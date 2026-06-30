
import { createEvent, serializeEvent } from './protocol';
import { GameStreamEvent } from './types';

/**
 * Wraps an existing async function (Tool) to emit 'tool_start' and 'tool_end' events.
 * 
 * @param toolName The name of the tool (for the UI)
 * @param toolFn The actual function to execute
 * @param input The input to the function
 * @returns An AsyncGenerator that yields events and then executes the function
 */
export async function* withStreamingTool<TInput, TOutput>(
    toolName: string,
    toolFn: (input: TInput) => Promise<TOutput>,
    input: TInput
): AsyncGenerator<GameStreamEvent, TOutput, unknown> {

    // 1. Emit Start
    yield createEvent('tool_start', {
        tool: toolName,
        input: input as any // Loose typing for the payload to avoid complexity
    });

    try {
        // 2. Execute
        const result = await toolFn(input);

        // 3. Emit End
        yield createEvent('tool_end', {
            tool: toolName,
            result: result as any
        });

        return result;

    } catch (error: any) {
        // We log the error via event but rethrow it so the coordinator can handle it logic-wise
        yield createEvent('debug', {
            message: `Tool '${toolName}' failed: ${error.message}`
        });
        throw error;
    }
}
