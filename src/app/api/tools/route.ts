import { getMcpManager } from "@/lib/mcp-manager";

export async function GET() {
  try {
    const manager = await getMcpManager();
    const tools = manager.listAllTools();
    const servers = manager.getServerNames();

    return Response.json({
      servers,
      tools: tools.map((t) => ({
        serverName: t.serverName,
        name: t.name,
        description: t.description,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list tools",
      },
      { status: 500 }
    );
  }
}
