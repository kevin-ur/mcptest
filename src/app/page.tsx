"use client";

import { useState, useCallback, useRef } from "react";
import ChatPanel from "@/components/ChatPanel";
import VoiceInput from "@/components/VoiceInput";
import ToolsSidebar from "@/components/ToolsSidebar";
import type { ChatMessageUI, ToolCallUI } from "@/types";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessageUI = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };

      const assistantMsg: ChatMessageUI = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        toolCalls: [],
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsLoading(true);

      const chatHistory = [
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: text.trim() },
      ];

      try {
        abortRef.current = new AbortController();
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "tool_call":
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    const tc: ToolCallUI = {
                      name: data.name,
                      arguments: data.arguments,
                      status: "calling",
                    };
                    last.toolCalls = [...(last.toolCalls || []), tc];
                  }
                  return updated;
                });
                break;

              case "tool_result":
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant" && last.toolCalls) {
                    const tc = last.toolCalls.find(
                      (t) => t.name === data.name && t.status === "calling"
                    );
                    if (tc) {
                      tc.result = data.result;
                      tc.status = "done";
                    }
                    last.toolCalls = [...last.toolCalls];
                  }
                  return updated;
                });
                break;

              case "text_delta":
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    last.content += data.content;
                  }
                  return updated;
                });
                break;

              case "error":
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === "assistant") {
                    last.content = `错误: ${data.message}`;
                  }
                  return updated;
                });
                break;
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              last.content = `请求失败: ${(error as Error).message}`;
            }
            return updated;
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  return (
    <div className="flex h-screen">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-800 bg-gray-900/50 px-6 py-3">
          <h1 className="text-lg font-semibold">MCP Voice Agent</h1>
          <p className="text-xs text-gray-500">
            语音驱动 · Qwen 大模型 · MCP 工具调用
          </p>
        </header>

        {/* Chat messages */}
        <ChatPanel messages={messages} isLoading={isLoading} />

        {/* Input area */}
        <div className="border-t border-gray-800 bg-gray-900/50 p-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
            />

            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息，或点击麦克风说话..."
                disabled={isLoading}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                发送
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tools sidebar */}
      <ToolsSidebar />
    </div>
  );
}
