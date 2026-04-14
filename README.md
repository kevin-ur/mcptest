# MCP Voice Agent

语音驱动的 MCP 智能助手 —— 通过语音或文字输入指令，由 Qwen 大模型理解意图，通过 MCP 协议调用工具执行操作。

## 架构

```
[浏览器]                      [Next.js 后端]                [外部服务]
 语音 → Web Speech API         API Routes                   DashScope (Qwen)
 → 文字 → POST /api/chat  →   MCP Host/Client  ←→          MCP Servers (工具)
 ← 回复 ← SSE stream      ←   Agent Loop
```

**核心流程：**
1. 用户通过麦克风语音输入（Web Speech API）或键盘文字输入
2. 文字发送到 Next.js API Route (`/api/chat`)
3. 后端将用户消息 + MCP 工具定义发送给 Qwen（DashScope OpenAI 兼容 API）
4. Qwen 返回 `tool_calls` → 后端通过 MCP Client 执行对应工具
5. 工具执行结果回传 Qwen，生成最终回复
6. 通过 SSE 流式返回前端展示

## 文件结构

```
mcptest/
├── package.json                  # 项目配置与依赖
├── next.config.mjs               # Next.js 配置
├── tsconfig.json                 # TypeScript 配置
├── postcss.config.mjs            # PostCSS / Tailwind CSS 配置
├── mcp-config.json               # MCP Server 连接配置
├── .env.example                  # 环境变量模板
├── .gitignore
│
├── src/
│   ├── types.ts                  # 前端共用类型定义 (消息、工具)
│   ├── types/
│   │   └── speech.d.ts           # Web Speech API TypeScript 类型声明
│   │
│   ├── lib/                      # 后端核心模块
│   │   ├── mcp-manager.ts        # MCP 连接管理器 (单例模式)
│   │   │                         #   - 启动时读取 mcp-config.json 连接所有 Server
│   │   │                         #   - listAllTools(): 聚合所有 Server 的工具
│   │   │                         #   - callTool(): 路由工具调用到对应 Server
│   │   ├── tool-converter.ts     # MCP tool schema → OpenAI function calling 格式转换
│   │   ├── qwen-client.ts        # DashScope API 客户端 (基于 OpenAI SDK 兼容模式)
│   │   └── agent-loop.ts         # Agent 编排循环
│   │                             #   - 用户消息 → Qwen → 检查 tool_calls
│   │                             #   - 有 tool_calls → MCP 执行 → 结果回传 Qwen
│   │                             #   - 循环直到纯文本回复，通过 SSE 流式输出
│   │
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # 根布局 (HTML head、全局样式)
│   │   ├── globals.css           # 全局 CSS (Tailwind)
│   │   ├── page.tsx              # 主页面 (整合语音输入 + 对话面板 + 工具侧栏)
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts      # POST /api/chat — 聊天接口 (SSE 流式响应)
│   │       └── tools/
│   │           └── route.ts      # GET /api/tools — 查询可用 MCP 工具列表
│   │
│   └── components/               # React 前端组件
│       ├── VoiceInput.tsx        # 语音输入组件 (Web Speech API, zh-CN)
│       ├── ChatPanel.tsx         # 对话面板 (消息列表 + 工具调用过程展示)
│       └── ToolsSidebar.tsx      # 工具侧边栏 (已连接 MCP Server 和工具列表)
```

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的阿里云 DashScope API Key：

```
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
QWEN_MODEL=qwen-plus
```

> API Key 获取：登录 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 创建

### 3. 配置 MCP Server

编辑 `mcp-config.json`，配置要连接的 MCP Server：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/tmp/mcp-workspace"
      ]
    }
  }
}
```

可添加多个 MCP Server，每个 Server 提供不同的工具能力。支持 stdio transport（本地进程启动）。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 **http://localhost:3000**

### 5. 使用

- **语音输入**：点击「按下说话」按钮，对着麦克风说话（需使用 Chrome/Edge 浏览器）
- **文字输入**：在底部输入框直接输入文字，按回车或点击「发送」
- **工具侧栏**：右侧显示已连接的 MCP Server 和可用工具列表

## 技术栈

| 模块 | 技术 |
|------|------|
| 前端框架 | Next.js (App Router) + React + TypeScript |
| 样式 | Tailwind CSS |
| 语音识别 | Web Speech API (浏览器原生) |
| 大模型 | Qwen (阿里云 DashScope OpenAI 兼容 API) |
| MCP 客户端 | @modelcontextprotocol/sdk |
| API 通信 | SSE (Server-Sent Events) 流式传输 |

## 构建生产版本

```bash
npm run build
npm run start
```
