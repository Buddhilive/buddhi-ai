/**
 * sandbox-tools.ts
 *
 * Provides tool definitions, schema specifications, and execution helpers
 * for the ReAct coding agent operating on the WebAssembly POSIX Sandbox.
 */

import type { BuddhiAIToolDefinition } from "@/types/messages";
import type { SandboxBridge } from "@/types/sandbox";

/**
 * Declared tools for Gemma 4 native tool-calling.
 */
export const SANDBOX_TOOLS: BuddhiAIToolDefinition[] = [
  {
    name: "write_file",
    description:
      "Create or overwrite a file in the project workspace (/workspace). Use this to create or update code components, styles, or configuration.",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path within the workspace to write to (e.g. 'src/app/page.tsx', 'components/button.tsx', 'package.json').",
      },
      content: {
        type: "string",
        description: "The complete new content of the file.",
      },
    },
    required: ["path", "content"],
  },
  {
    name: "read_file",
    description:
      "Read the full contents of a file in the project workspace (/workspace).",
    parameters: {
      path: {
        type: "string",
        description:
          "Relative path within the workspace to read (e.g. 'src/app/page.tsx', 'package.json').",
      },
    },
    required: ["path"],
  },
  {
    name: "list_files",
    description:
      "List files and directories in the workspace (/workspace) tree.",
    parameters: {
      path: {
        type: "string",
        description:
          "Optional subdirectory to list. Defaults to the workspace root.",
      },
    },
  },
  {
    name: "run_command",
    description:
      "Execute a shell command inside the WebAssembly POSIX sandbox workspace (e.g. 'npm install <pkg>', 'ls -la').",
    parameters: {
      command: {
        type: "string",
        description: "Shell command line to execute.",
      },
    },
    required: ["command"],
  },
];

/**
 * System prompt guidelines for the ReAct coding agent.
 */
export const REACT_AGENT_SYSTEM_INSTRUCTIONS = `
You are an expert full-stack developer and autonomous coding agent working directly in a live Next.js 16 WebAssembly Sandbox.
Your workspace root is located at /workspace.

CRITICAL OPERATIONAL RULES:
1. When asked to create, edit, or fix code, DO NOT simply print the code into the chat. ALWAYS invoke the \`write_file\` tool to write the code directly into the workspace files.
2. If you need to inspect existing code before modifying, use the \`read_file\` or \`list_files\` tool.
3. If packages need to be installed, invoke the \`run_command\` tool (e.g. \`npm install lucide-react\`).
4. Keep your changes focused and cleanly modular. Ensure proper imports and exports.
5. When you need to take action, invoke tools using tool calling syntax:
   <|channel>call:write_file{path:<|"|>src/app/page.tsx<|"|>,content:<|"|>// code here<|"|>}<channel|>
   or
   <|tool_call>call:write_file{path:<|"|>src/app/page.tsx<|"|>,content:<|"|>// code here<|"|>}<tool_call|>
6. After completing the necessary tool actions and receiving the results, provide a brief, friendly summary in visible text to the user explaining what you did.
`.trim();

/**
 * Executes a tool invocation against the active SandboxBridge.
 */
export async function executeSandboxTool(
  toolName: string,
  args: Record<string, unknown>,
  bridge: SandboxBridge | null
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  if (!bridge) {
    return {
      success: false,
      error: "WebAssembly Sandbox is not yet initialized or ready. Please wait for the sandbox to boot.",
    };
  }

  try {
    switch (toolName) {
      case "write_file": {
        const path = String(args.path || "");
        const content = typeof args.content === "string" ? args.content : String(args.content ?? "");
        if (!path) {
          return { success: false, error: "Missing required argument 'path'." };
        }
        const res = await bridge.writeFile(path, content);
        return { success: true, result: res };
      }

      case "read_file": {
        const path = String(args.path || "");
        if (!path) {
          return { success: false, error: "Missing required argument 'path'." };
        }
        const res = await bridge.readFile(path);
        return { success: true, result: res };
      }

      case "list_files": {
        const path = args.path ? String(args.path) : undefined;
        const res = await bridge.listFiles(path);
        return { success: true, result: res };
      }

      case "run_command": {
        const command = String(args.command || "");
        if (!command) {
          return { success: false, error: "Missing required argument 'command'." };
        }
        const res = await bridge.runCommand(command);
        return { success: true, result: res };
      }

      default: {
        return {
          success: false,
          error: `Unknown tool '${toolName}'. Available tools: ${SANDBOX_TOOLS.map((t) => t.name).join(", ")}.`,
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Tool execution failed: ${message}` };
  }
}
