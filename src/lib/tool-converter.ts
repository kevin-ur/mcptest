import type { McpToolInfo } from "./mcp-manager";
import type OpenAI from "openai";

/**
 * Convert MCP tool definitions to OpenAI function calling format
 */
export function mcpToolsToOpenAI(
  tools: McpToolInfo[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.inputSchema as OpenAI.FunctionParameters,
    },
  }));
}
