export interface ChatMessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallUI[];
}

export interface ToolCallUI {
  name: string;
  arguments: string;
  result?: string;
  status: "calling" | "done" | "error";
}

export interface ToolInfo {
  serverName: string;
  name: string;
  description?: string;
}
