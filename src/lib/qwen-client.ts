import OpenAI from "openai";

let clientInstance: OpenAI | null = null;

export function getQwenClient(): OpenAI {
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
  }
  return clientInstance;
}

export function getModelName(): string {
  return process.env.QWEN_MODEL || "qwen-plus";
}
