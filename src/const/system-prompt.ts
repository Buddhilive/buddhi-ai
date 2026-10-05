/**
 * System prompt injected as the first message in every conversation.
 *
 * Keep this concise — the model's context window is limited and every token
 * used here reduces the space available for the actual conversation.
 */
export * from "./system-prompts/academic-research";
export { ACADEMIC_RESEARCH_SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT } from "./system-prompts/academic-research";
export { GAP_ANALYSIS_SYSTEM_PROMPT } from "./system-prompts/gap-analysis";
