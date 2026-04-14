import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "fs";
import { join } from "path";

export interface McpToolInfo {
  serverName: string;
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

interface ConnectedServer {
  client: Client;
  transport: StdioClientTransport;
  tools: McpToolInfo[];
}

class McpManager {
  private servers: Map<string, ConnectedServer> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const configPath = join(process.cwd(), "mcp-config.json");
    let config: McpConfig;
    try {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      console.warn("No mcp-config.json found, starting without MCP servers");
      this.initialized = true;
      return;
    }

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        await this.connectServer(name, serverConfig);
        console.log(`MCP Server connected: ${name}`);
      } catch (error) {
        console.error(`Failed to connect MCP Server "${name}":`, error);
      }
    }

    this.initialized = true;
  }

  private async connectServer(
    name: string,
    config: McpServerConfig
  ): Promise<void> {
    const client = new Client({
      name: "mcp-voice-agent",
      version: "1.0.0",
    });

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...config.env } as Record<string, string>,
    });

    await client.connect(transport);

    const toolsResult = await client.listTools();
    const tools: McpToolInfo[] = toolsResult.tools.map((t) => ({
      serverName: name,
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));

    this.servers.set(name, { client, transport, tools });
  }

  listAllTools(): McpToolInfo[] {
    const allTools: McpToolInfo[] = [];
    for (const server of this.servers.values()) {
      allTools.push(...server.tools);
    }
    return allTools;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    for (const server of this.servers.values()) {
      const tool = server.tools.find((t) => t.name === toolName);
      if (tool) {
        const result = await server.client.callTool({
          name: toolName,
          arguments: args,
        });
        return result;
      }
    }
    throw new Error(`Tool not found: ${toolName}`);
  }

  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  isReady(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let mcpManagerInstance: McpManager | null = null;

export async function getMcpManager(): Promise<McpManager> {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new McpManager();
    await mcpManagerInstance.initialize();
  }
  return mcpManagerInstance;
}
