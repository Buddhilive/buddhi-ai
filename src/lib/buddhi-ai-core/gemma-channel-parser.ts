/**
 * gemma-channel-parser.ts
 *
 * Stream parser for Gemma 4 channel tokens (<|channel>...<channel|>).
 * Correctly strips control markers, isolates thought/reasoning blocks,
 * and extracts tool calls without leaking raw tags into visible text.
 */

export interface ToolCallPayload {
  name: string;
  args: Record<string, unknown>;
  raw: string;
}

export interface GemmaParserCallbacks {
  onReasoningStart?: () => void;
  onReasoningDelta?: (delta: string) => void;
  onReasoningEnd?: () => void;
  onToolCall?: (toolCall: ToolCallPayload) => void;
  onTextStart?: () => void;
  onTextDelta?: (delta: string) => void;
  onTextEnd?: () => void;
}

/**
 * Parses Gemma 4 tool arguments from string (supporting both <|"|> delimiter and standard JSON).
 */
export function parseGemmaToolArguments(rawArgs: string): Record<string, unknown> {
  const trimmed = rawArgs.trim();
  if (!trimmed || trimmed === "{}") return {};

  // Try standard JSON parse first
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue to Gemma format parser
  }

  // Convert Gemma 4 <|"|> delimiter to valid JSON quotes
  // e.g. {path:<|"|>src/app/page.tsx<|"|>,content:<|"|>...<|"|>}
  try {
    let jsonCandidate = trimmed;
    // Replace <|"|> with "
    jsonCandidate = jsonCandidate.replace(/<\|"\|>/g, '"');

    // Ensure unquoted object keys are quoted: {key: "val"} -> {"key": "val"}
    jsonCandidate = jsonCandidate.replace(/([{,])\s*([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');

    const parsed = JSON.parse(jsonCandidate);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Continue to regex-based fallback
  }

  // Fallback: regex extraction of key: <|"|>value<|"|> or key: "value"
  const result: Record<string, unknown> = {};
  const kvRegex = /([a-zA-Z0-9_$-]+)\s*:\s*(?:<\|"\|>([\s\S]*?)<\|"\|>|"([^"]*)"|'([^']*)'|([^\s,}]+))/g;
  let match: RegExpExecArray | null;
  while ((match = kvRegex.exec(trimmed)) !== null) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4] ?? match[5];
    if (val === "true") result[key] = true;
    else if (val === "false") result[key] = false;
    else if (val === "null") result[key] = null;
    else if (!isNaN(Number(val))) result[key] = Number(val);
    else result[key] = val;
  }

  return result;
}

/**
 * Robust streaming parser for Gemma 4 channels.
 */
export class GemmaChannelStreamParser {
  private buffer = "";
  private isReasoningOn: boolean;
  private callbacks: GemmaParserCallbacks;

  private currentChannel: "none" | "thought" | "call" = "none";
  private currentToolName = "";
  private currentCallBuffer = "";

  private reasoningActive = false;
  private textStarted = false;
  private lastReasoningChar = "";

  // Maximum potential prefix length of control tags: e.g. "<|tool_call>call:" is 18 chars
  private readonly HOLD_BACK_LEN = 24;

  constructor(callbacks: GemmaParserCallbacks, isReasoningOn = true) {
    this.callbacks = callbacks;
    this.isReasoningOn = isReasoningOn;
  }

  /**
   * Feed a new text chunk from the LLM stream.
   */
  public push(chunk: string): void {
    if (!chunk) return;
    this.buffer += chunk;
    this.processBuffer();
  }

  /**
   * Complete stream generation and flush any buffered text.
   */
  public flush(): void {
    // If still in thought channel, emit remaining buffer as thought
    if (this.currentChannel === "thought") {
      if (this.buffer) {
        this.emitReasoning(this.buffer);
      }
      this.buffer = "";
      this.currentChannel = "none";
    } else if (this.currentChannel === "call") {
      this.emitCurrentToolCall();
      this.currentChannel = "none";
    }

    // If reasoning block is still open, close it now
    if (this.isReasoningOn && this.reasoningActive) {
      this.callbacks.onReasoningEnd?.();
      this.reasoningActive = false;
      this.lastReasoningChar = "";
    }

    // Flush any remaining buffer to text if not a control tag
    let remaining = this.buffer;
    this.buffer = "";

    // Strip any dangling control tags from remaining text
    remaining = remaining
      .replace(/<\|(?:channel|tool_call|tool)>[a-zA-Z0-9_:-]*/g, "")
      .replace(/<(?:channel|tool_call|tool)\|>/g, "")
      .replace(/<\|turn>[a-zA-Z0-9_-]*/g, "")
      .replace(/<turn\|>/g, "")
      .replace(/<start_of_turn>[a-zA-Z0-9_-]*/g, "")
      .replace(/<end_of_turn>/g, "")
      .replace(/<\|think\|>/g, "");

    if (remaining.trim()) {
      if (!this.textStarted) {
        this.callbacks.onTextStart?.();
        this.textStarted = true;
      }
      this.callbacks.onTextDelta?.(remaining);
    }

    if (this.textStarted) {
      this.callbacks.onTextEnd?.();
      this.textStarted = false;
    }
  }

  private processBuffer(): void {
    while (this.buffer.length > 0) {
      // 1. Inside THOUGHT channel
      if (this.currentChannel === "thought") {
        const endIdx = this.buffer.indexOf("<channel|>");
        if (endIdx !== -1) {
          const thoughtContent = this.buffer.slice(0, endIdx);
          if (thoughtContent) {
            this.emitReasoning(thoughtContent);
          }
          // Consume up to and including <channel|>
          this.buffer = this.buffer.slice(endIdx + "<channel|>".length);
          this.currentChannel = "none";
          // NOTE: Do NOT call onReasoningEnd() here!
          // Gemma 4 streams thought in multiple consecutive fragments.
          // Reasoning stays active until real visible text or a tool call starts.
          continue;
        }

        // Keep a small hold-back buffer in case <channel|> is partially arrived
        if (this.buffer.length > this.HOLD_BACK_LEN) {
          const emitLen = this.buffer.length - this.HOLD_BACK_LEN;
          const chunk = this.buffer.slice(0, emitLen);
          if (chunk) {
            this.emitReasoning(chunk);
          }
          this.buffer = this.buffer.slice(emitLen);
        }
        break;
      }

      // 2. Inside CALL channel
      if (this.currentChannel === "call") {
        // Match closing tag: <channel|> or <tool_call|>
        const chanEndIdx = this.buffer.indexOf("<channel|>");
        const toolEndIdx = this.buffer.indexOf("<tool_call|>");
        let endIdx = -1;
        let endTagLen = 0;

        if (chanEndIdx !== -1 && toolEndIdx !== -1) {
          if (chanEndIdx <= toolEndIdx) {
            endIdx = chanEndIdx;
            endTagLen = "<channel|>".length;
          } else {
            endIdx = toolEndIdx;
            endTagLen = "<tool_call|>".length;
          }
        } else if (chanEndIdx !== -1) {
          endIdx = chanEndIdx;
          endTagLen = "<channel|>".length;
        } else if (toolEndIdx !== -1) {
          endIdx = toolEndIdx;
          endTagLen = "<tool_call|>".length;
        }

        if (endIdx !== -1) {
          this.currentCallBuffer += this.buffer.slice(0, endIdx);
          this.buffer = this.buffer.slice(endIdx + endTagLen);
          this.emitCurrentToolCall();
          this.currentChannel = "none";
          continue;
        }

        // Buffer all content of call until end tag
        this.currentCallBuffer += this.buffer;
        this.buffer = "";
        break;
      }

      // 3. currentChannel === "none": normal mode, scanning for opening channels
      // Match opening tag without swallowing following space (tokens like " user" start with space)
      const thoughtTagMatch = this.buffer.match(/<\|channel>thought(?:\r?\n)?/);
      // Support both <|channel>call:name and <|tool_call>call:name or <|tool_call>name
      const callTagMatch = this.buffer.match(/(?:<\|channel>|<\|tool_call>)(?:call:)?([a-zA-Z0-9_$-]+)/);

      const thoughtIdx = thoughtTagMatch?.index ?? -1;
      const callIdx = callTagMatch?.index ?? -1;

      // Determine which tag comes first
      let nextTagType: "thought" | "call" | null = null;
      let nextTagIdx = -1;

      if (thoughtIdx !== -1 && callIdx !== -1) {
        if (thoughtIdx <= callIdx) {
          nextTagType = "thought";
          nextTagIdx = thoughtIdx;
        } else {
          nextTagType = "call";
          nextTagIdx = callIdx;
        }
      } else if (thoughtIdx !== -1) {
        nextTagType = "thought";
        nextTagIdx = thoughtIdx;
      } else if (callIdx !== -1) {
        nextTagType = "call";
        nextTagIdx = callIdx;
      }

      if (nextTagType === "thought") {
        const preText = this.buffer.slice(0, nextTagIdx);
        // If reasoning was already active, any whitespace before another thought tag
        // is intra-reasoning spacing, so emit to reasoning rather than text!
        if (this.reasoningActive) {
          if (preText) {
            this.emitReasoning(preText);
          }
        } else {
          if (preText.trim()) {
            this.emitText(preText);
          }
        }

        // Consume thought tag
        const matchedTag = thoughtTagMatch![0];
        this.buffer = this.buffer.slice(nextTagIdx + matchedTag.length);
        this.currentChannel = "thought";

        if (this.isReasoningOn && !this.reasoningActive) {
          if (this.textStarted) {
            this.callbacks.onTextEnd?.();
            this.textStarted = false;
          }
          this.callbacks.onReasoningStart?.();
          this.reasoningActive = true;
          this.lastReasoningChar = "";
        }
        continue;
      }

      if (nextTagType === "call") {
        // If reasoning is still active, close it before tool call starts
        if (this.reasoningActive) {
          if (this.isReasoningOn) {
            this.callbacks.onReasoningEnd?.();
          }
          this.reasoningActive = false;
          this.lastReasoningChar = "";
        }

        const preText = this.buffer.slice(0, nextTagIdx);
        if (preText.trim()) {
          this.emitText(preText);
        }

        this.currentToolName = callTagMatch![1];
        this.currentCallBuffer = "";
        const matchedTag = callTagMatch![0];
        this.buffer = this.buffer.slice(nextTagIdx + matchedTag.length);
        this.currentChannel = "call";
        continue;
      }

      // No full tag found.
      // If reasoning is active:
      if (this.reasoningActive) {
        // If buffer contains only whitespace or potential partial tag:
        const trimmed = this.buffer.trim();
        const partialTagIdx = this.buffer.lastIndexOf("<");
        const hasPotentialTag = partialTagIdx !== -1 && partialTagIdx >= this.buffer.length - this.HOLD_BACK_LEN;

        if (trimmed.length === 0 || hasPotentialTag) {
          // Keep buffering: don't close reasoning yet
          break;
        }

        // There is non-whitespace content and no tag: reasoning is truly finished
        if (this.isReasoningOn) {
          this.callbacks.onReasoningEnd?.();
        }
        this.reasoningActive = false;
        this.lastReasoningChar = "";
      }

      // Check if end of buffer might be a partial tag
      const partialTagIdx = this.buffer.lastIndexOf("<");
      if (partialTagIdx !== -1 && partialTagIdx >= this.buffer.length - this.HOLD_BACK_LEN) {
        const potentialTag = this.buffer.slice(partialTagIdx);
        if (
          "<|channel>thought".startsWith(potentialTag) ||
          "<|channel>call:".startsWith(potentialTag) ||
          "<|tool_call>".startsWith(potentialTag) ||
          "<channel|>".startsWith(potentialTag) ||
          "<tool_call|>".startsWith(potentialTag) ||
          "<|turn>".startsWith(potentialTag)
        ) {
          const emitTextChunk = this.buffer.slice(0, partialTagIdx);
          if (emitTextChunk.trim()) {
            this.emitText(emitTextChunk);
          }
          this.buffer = potentialTag;
          break;
        }
      }

      // Remaining buffer is visible text
      this.emitText(this.buffer);
      this.buffer = "";
      break;
    }
  }

  private emitReasoning(delta: string): void {
    if (!delta || !this.isReasoningOn) return;
    let normalized = delta;
    // Prevent duplicate consecutive horizontal spaces (e.g. if preText had ' ' and token had ' ')
    if (this.lastReasoningChar === " " && normalized.startsWith(" ")) {
      normalized = normalized.replace(/^ +/, "");
    }
    if (!normalized) return;
    this.lastReasoningChar = normalized.slice(-1);
    this.callbacks.onReasoningDelta?.(normalized);
  }

  private emitText(text: string): void {
    if (!text) return;
    // Strip standalone control tokens if any leaked
    const clean = text
      .replace(/<(?:channel|tool_call|tool)\|>/g, "")
      .replace(/<\|turn>[a-zA-Z0-9_-]*/g, "")
      .replace(/<turn\|>/g, "")
      .replace(/<\|think\|>/g, "");
    if (!clean) return;

    if (!this.textStarted) {
      this.callbacks.onTextStart?.();
      this.textStarted = true;
    }
    this.callbacks.onTextDelta?.(clean);
  }

  private emitCurrentToolCall(): void {
    if (!this.currentToolName) return;

    const raw = this.currentCallBuffer;
    const args = parseGemmaToolArguments(raw);

    this.callbacks.onToolCall?.({
      name: this.currentToolName,
      args,
      raw,
    });

    this.currentToolName = "";
    this.currentCallBuffer = "";
  }
}

