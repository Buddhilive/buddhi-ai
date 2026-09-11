# Feature Specification: ReAct Coding Agent, Gemma 4 Thinking Fixes, and UI Cleanup

**Feature Branch**: `005-react-coding-agent`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Fix Gemma 4 thinking mode tag leakage, implement ReAct coding agent tools with WebAssembly Sandbox integration rendered via Tool element, and remove Next.js Vibe Coding Prompts."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gemma 4 Thinking Mode & Tag Parsing (Priority: P1)

As a user interacting with the Gemma 4 model, I want internal reasoning content to be cleanly extracted and displayed in the collapsible reasoning disclosure without any raw control tags (`<|channel>thought`, `<channel|>`), so that the chat conversation remains clean, legible, and uncorrupted.

**Why this priority**: Raw control tokens currently leak into visible message text across streaming fragments, breaking markdown formatting and degrading the conversational user experience. Fixing this is an essential prerequisite for any reliable model output.

**Independent Test**: Can be fully tested by submitting a prompt with reasoning enabled, verifying that the model's thoughts are contained inside the `<Reasoning>` component without any `<|channel>thought` or `<channel|>` text leaking into the visible message or thought text.

**Acceptance Scenarios**:

1. **Given** reasoning mode is enabled, **When** Gemma 4 generates thought tokens wrapped in `<|channel>thought ... <channel|>`, **Then** the thought text is streamed into the reasoning panel and all opening and closing channel tags are completely stripped from the stream.
2. **Given** thought tokens arrive in tiny fragments without preceding newlines (e.g., `<|channel>thought Process<channel|>` or `<|channel>thought :`), **Then** the parser detects and strips all variants of the opening tag (`<|channel>thought\n`, `<|channel>thought `, `<|channel>thought`), extracts the content, and never leaves trailing `<channel|>` tags in visible text.
3. **Given** reasoning mode is disabled, **When** the model still emits internal thought channels, **Then** the thought content and tags are silently suppressed from visible user text.
4. **Given** multiple sequential thought blocks or turn switches occur, **Then** all channel headers and footers are safely stripped without corrupting adjacent user-facing markdown text.

---

### User Story 2 - ReAct Coding Agent Sandbox Tools (Priority: P1)

As a user requesting changes or new features for my Next.js application, I want the AI to act as an autonomous ReAct coding agent equipped with tools to directly manipulate the WebAssembly POSIX sandbox (`write_file`, `read_file`, `list_files`, `run_command`), so that code is written directly to the running application rather than dumped into the chat text.

**Why this priority**: The primary purpose of the application is a live sandbox development environment. Dumping code into the chat requires manual user copy-pasting, defeating the core agentic workflow.

**Independent Test**: Can be fully tested by asking the agent to "Change the heading in `src/app/page.tsx` to 'Hello ReAct'". The agent invokes the `write_file` tool to update the file in the sandbox, the WebAssembly virtual filesystem updates, and the Next.js preview immediately hot-reloads with the new heading.

**Acceptance Scenarios**:

1. **Given** a coding task requested by the user, **When** the agent decides to create or modify code, **Then** it invokes `write_file` with the destination path and file contents, and the client-side ReAct engine writes the file to `/workspace/<path>` in the WebAssembly sandbox.
2. **Given** the agent needs to inspect existing code or project structure, **When** it calls `read_file` or `list_files`, **Then** the sandbox reads the virtual filesystem and returns the contents/file tree as a tool response back to the agent.
3. **Given** the agent needs to install a package or run a shell command, **When** it invokes `run_command`, **Then** the sandbox executes the command in the sandbox kernel and returns the stdout/stderr exit code to the agent.
4. **Given** the agent completes tool executions, **When** the tools return output, **Then** the ReAct loop automatically sends tool responses back to the model until the model concludes with a final response message for the user.

---

### User Story 3 - Visual Tool Invocation Rendering via AI Elements `Tool` (Priority: P2)

As a user watching the agent work, I want to see clear, real-time visual feedback for each tool invocation (including tool name, execution status, inputs, and results) using the AI Elements `Tool` component, so that I can monitor what the agent is doing in the sandbox.

**Why this priority**: Observability and transparency build user trust during autonomous multi-step operations.

**Independent Test**: Can be fully tested by inspecting the chat message stream while a tool executes, verifying the `<Tool>` collapsible component shows a "Running" badge, updates to "Completed" (or "Error") upon finish, and can be expanded to inspect arguments and results.

**Acceptance Scenarios**:

1. **Given** the model issues a tool call, **When** it is emitted, **Then** a `<Tool>` component appears in the chat message stream showing the tool name and an active "Running" badge.
2. **Given** tool execution completes successfully in the sandbox, **Then** the badge updates to "Completed", and expanding the tool shows the formatted JSON parameters and the execution output.
3. **Given** tool execution fails (e.g. invalid file path or command non-zero exit), **Then** the badge updates to "Error", and expanding shows the error details.

---

### User Story 4 - Remove "Next.js Vibe Coding Prompts" (Priority: P3)

As a user opening a fresh chat session, I want a clean chat panel without the "Next.js Vibe Coding Prompts" suggestion pills, so that the interface is distraction-free and aligned with the coding agent workflow.

**Why this priority**: Eliminates visual clutter and outdated prompt templates from earlier iterations.

**Independent Test**: Can be fully tested by opening a new chat session and confirming that the prompt suggestion banner and buttons are no longer rendered in the chat panel empty state.

**Acceptance Scenarios**:

1. **Given** a new or empty chat session with zero messages, **When** the chat panel renders, **Then** no "Next.js Vibe Coding Prompts" banner or suggestion buttons are shown.

---

## Edge Cases

- **Malformed Tool Arguments**: If the model outputs improperly formatted arguments in the tool call, the ReAct loop returns an error response indicating the schema issue so the model can self-correct.
- **Concurrent Streaming & Dev Server Restarts**: When `write_file` modifies files watched by Next.js, the hot-module-reload (HMR) or dev server restart must not block subsequent tool executions or crash the chat thread.
- **User Abort During Tool Execution**: If the user clicks "Stop" while a tool is executing or between ReAct steps, the current execution must safely terminate and prevent subsequent tool calls.
- **Large File Reading/Writing**: Files written or read must handle multiline source code, special characters, and code fences without premature truncation or escape-string errors.
- **Multiple Tool Calls in Single Turn**: If Gemma 4 emits multiple tool calls in a single turn, the ReAct executor processes them sequentially or concurrently and feeds all results back to the model.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Stream parser in `chat-api.ts` MUST robustly detect Gemma 4 thought channels (`<|channel>thought`) regardless of trailing whitespace or lack of newlines.
- **FR-002**: Stream parser MUST strip all `<|channel>thought` and `<channel|>` delimiters from both reasoning output and visible text output.
- **FR-003**: Stream parser MUST route internal reasoning content to `reasoning-delta` events when reasoning mode is active, and suppress it when disabled.
- **FR-004**: System prompt and chat template generator MUST register the sandbox tool definitions (`write_file`, `read_file`, `list_files`, `run_command`) in Gemma 4 native tool format.
- **FR-005**: Parser MUST detect Gemma 4 tool call channels (`<|channel>call:tool_name{...}<channel|>`) during model output streaming and emit structured tool call parts.
- **FR-006**: ReAct execution manager MUST execute requested tools against the active WebAssembly Sandbox instance (`Sandbox.fs` and `Sandbox.commands`).
- **FR-007**: `write_file` tool MUST write file content to `/workspace/<path>`, trigger virtual filesystem synchronization, and update IndexedDB persistence.
- **FR-008**: `read_file` tool MUST read file content from `/workspace/<path>` and return it to the model.
- **FR-009**: `list_files` tool MUST return directory listings or recursive file trees for the requested directory in `/workspace`.
- **FR-010**: `run_command` tool MUST execute shell commands in the sandbox workspace, capturing exit code, stdout, and stderr.
- **FR-011**: ReAct loop MUST automatically feed tool responses (`<|channel>call:name{...}<channel|>` / response channel) back to the model to enable autonomous multi-turn reasoning and acting.
- **FR-012**: Chat message renderer MUST render tool calls using `@/components/ai-elements/tool.tsx` (`Tool`, `ToolHeader`, `ToolContent`, `ToolInput`, `ToolOutput`).
- **FR-013**: Tool elements MUST reflect live execution states (`input-available` / Running, `output-available` / Completed, `output-error` / Error).
- **FR-014**: "Next.js Vibe Coding Prompts" section and suggestion buttons MUST be removed from `src/components/custom/chat/chat-session.tsx`.
- **FR-015**: Chat input MUST maintain disabled states during tool execution and sandbox initialization.

---

## Key Entities & Data Structures

- **`SandboxToolDefinition`**: Name, description, parameters schema (`write_file`, `read_file`, `list_files`, `run_command`).
- **`ToolUIPart` / `DynamicToolUIPart`**: AI SDK compatible tool part with `toolCallId`, `toolName`, `args`, `state`, and `output`.
- **`ReActStep`**: Iteration state tracking message turns, pending tool calls, executed results, and completion status.

---

## Success Criteria *(mandatory)*

- **SC-001**: 100% of `<|channel>thought` and `<channel|>` tags are removed from visible chat output and thought text across single and multi-turn conversations.
- **SC-002**: Prompting the agent to implement a feature (e.g. "Add a button to page.tsx") executes `write_file` in the sandbox without the user needing to copy-paste code.
- **SC-003**: The live Next.js sandbox preview reloads and reflects code changes made by the ReAct agent within 3 seconds of tool execution completion.
- **SC-004**: Tool executions display interactive `<Tool>` cards in the chat UI with accurate status badges and expandable parameter/output inspections.
- **SC-005**: Zero occurrences of "Next.js Vibe Coding Prompts" appear in the chat empty state.
- **SC-006**: The entire suite compiles cleanly without TypeScript errors or broken imports.
