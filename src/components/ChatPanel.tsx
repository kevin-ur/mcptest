"use client";

import { useRef, useEffect } from "react";
import type { ChatMessageUI } from "@/types";

interface ChatPanelProps {
  messages: ChatMessageUI[];
  isLoading: boolean;
}

export default function ChatPanel({ messages, isLoading }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-4">🎙️</div>
            <p className="text-lg">语音驱动的 MCP 智能助手</p>
            <p className="text-sm mt-2">
              点击麦克风按钮说话，或在下方输入文字
            </p>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-100"
            }`}
          >
            {/* Tool calls display */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="mb-2 space-y-2">
                {msg.toolCalls.map((tc, i) => (
                  <div
                    key={i}
                    className="bg-gray-900/50 rounded-lg p-2 text-xs border border-gray-700"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          tc.status === "calling"
                            ? "bg-yellow-400 animate-pulse"
                            : tc.status === "done"
                              ? "bg-green-400"
                              : "bg-red-400"
                        }`}
                      />
                      <span className="font-mono font-bold text-blue-300">
                        {tc.name}
                      </span>
                    </div>
                    <div className="text-gray-400 font-mono truncate">
                      参数: {tc.arguments}
                    </div>
                    {tc.result && (
                      <div className="text-gray-300 font-mono mt-1 max-h-32 overflow-y-auto">
                        结果: {tc.result.slice(0, 500)}
                        {tc.result.length > 500 ? "..." : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Message content */}
            {msg.content && (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-800 rounded-2xl px-4 py-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
