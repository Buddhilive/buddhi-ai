/**
 * System prompt injected as the first message in every conversation.
 *
 * This is prepended by MediaPipeChatTransport before the user messages are
 * passed to the language model. The ChatTemplateGenerator wraps it in the
 * Gemma `<start_of_turn>system … <end_of_turn>` block.
 *
 * Keep this concise — the model's context window is limited and every token
 * used here reduces the space available for the actual conversation.
 */
export * from "./system-prompts/default";
export * from "./system-prompts/prompt-builder";
