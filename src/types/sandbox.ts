export interface VibeCodingFile {
  path: string;
  content: string;
  language: string;
  isComplete: boolean;
}

export type SandboxStatus = 'idle' | 'booting' | 'running' | 'error';

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
