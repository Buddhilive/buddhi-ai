export interface VibeCodingFile {
  path: string;
  content: string;
  language: string;
  isComplete: boolean;
}

export type SandboxStatus =
  | 'idle'
  | 'booting'
  | 'scaffolding'
  | 'installing'
  | 'starting'
  | 'running'
  | 'error';

export type SandboxInitStage =
  | 'booting'
  | 'scaffolding'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

export interface SandboxLogEntry {
  id: string;
  timestamp: number;
  type: 'stdout' | 'stderr' | 'system';
  message: string;
}

export interface SandboxPortInfo {
  port: number;
  url: string;
}

export interface SandboxToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface SandboxBridge {
  writeFile: (path: string, content: string) => Promise<{ success: boolean; bytesWritten: number; path: string }>;
  readFile: (path: string) => Promise<{ success: boolean; content: string; path: string }>;
  listFiles: (path?: string) => Promise<{ success: boolean; files: string[] }>;
  runCommand: (command: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
}
