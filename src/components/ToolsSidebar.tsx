"use client";

import { useEffect, useState } from "react";
import type { ToolInfo } from "@/types";

export default function ToolsSidebar() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [servers, setServers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((data) => {
        setTools(data.tools || []);
        setServers(data.servers || []);
      })
      .catch(() => {
        setTools([]);
        setServers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className={`border-l border-gray-800 bg-gray-900 transition-all ${collapsed ? "w-12" : "w-72"}`}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        {!collapsed && (
          <h2 className="text-sm font-semibold text-gray-300">MCP 工具</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-300 p-1"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-60px)]">
          {loading && (
            <p className="text-xs text-gray-500">加载中...</p>
          )}

          {!loading && servers.length === 0 && (
            <p className="text-xs text-gray-500">
              未连接任何 MCP Server。
              <br />
              请检查 mcp-config.json
            </p>
          )}

          {servers.map((server) => (
            <div key={server}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {server}
              </h3>
              <div className="space-y-1">
                {tools
                  .filter((t) => t.serverName === server)
                  .map((tool) => (
                    <div
                      key={tool.name}
                      className="rounded-lg bg-gray-800/50 p-2 border border-gray-700/50"
                    >
                      <div className="text-xs font-mono text-blue-300">
                        {tool.name}
                      </div>
                      {tool.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {tool.description}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
