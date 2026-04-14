import type OpenAI from "openai";
import { getQwenClient, getModelName } from "./qwen-client";
import { getMcpManager } from "./mcp-manager";
import { mcpToolsToOpenAI } from "./tool-converter";

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
}

export interface ToolCallEvent {
  type: "tool_call";
  name: string;
  arguments: string;
}

export interface ToolResultEvent {
  type: "tool_result";
  name: string;
  result: string;
}

export interface TextDeltaEvent {
  type: "text_delta";
  content: string;
}

export interface DoneEvent {
  type: "done";
}

export type AgentEvent =
  | ToolCallEvent
  | ToolResultEvent
  | TextDeltaEvent
  | DoneEvent;

const SYSTEM_PROMPT = `你是一个智能助手，可以通过工具来帮助用户完成各种任务。
当用户提出请求时，分析请求并决定是否需要调用工具。
如果需要调用工具，请选择合适的工具并提供正确的参数。
请用中文回复用户。`;

export async function* runAgentLoop(
  messages: ChatMessage[]
): AsyncGenerator<AgentEvent> {
  const client = getQwenClient();
  const model = getModelName();
  const mcpManager = await getMcpManager();

  const mcpTools = mcpManager.listAllTools();
  const openaiTools =
    mcpTools.length > 0 ? mcpToolsToOpenAI(mcpTools) : undefined;

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map(
      (m) =>
        ({
          role: m.role,
          content: m.content,
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        }) as OpenAI.Chat.Completions.ChatCompletionMessageParam
    ),
  ];

  const MAX_TOOL_ROUNDS = 10;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model,
      messages: apiMessages,
      tools: openaiTools,
      stream: false,
    });

    const choice = response.choices[0];
    const message = choice.message;

    // If the model wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Add assistant message with tool calls to context
      apiMessages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== "function") continue;
        const fnName = toolCall.function.name;
        const fnArgs = toolCall.function.arguments;

        yield { type: "tool_call", name: fnName, arguments: fnArgs };

        let resultContent: string;
        try {
          const parsedArgs = JSON.parse(fnArgs);
          const result = await mcpManager.callTool(fnName, parsedArgs);
          resultContent = JSON.stringify(result);
        } catch (error) {
          resultContent = JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          });
        }

        yield { type: "tool_result", name: fnName, result: resultContent };

        apiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: resultContent,
        });
      }

      // Continue the loop — the model will process tool results
      continue;
    }

    // No tool calls — stream the final text response
    if (message.content) {
      yield { type: "text_delta", content: message.content };
    }

    break;
  }

  yield { type: "done" };
}
