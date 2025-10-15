/**
 * A callback function signature for tools that a language model can invoke.
 * It takes an arbitrary number of arguments and returns a Promise resolving to a string.
 */
type LanguageModelToolFunction = (...args: any[]) => Promise<string>;

/**
 * A description of a tool call that a language model can invoke.
 */
interface LanguageModelTool {
  /** The name of the tool. */
  name: string;
  /** A description of the tool's purpose. */
  description: string;
  /** JSON schema for the input parameters expected by the tool's execute function. */
  inputSchema: object;
  /** The function to be invoked by the user agent on behalf of the language model. */
  execute: LanguageModelToolFunction;
}

// ---

/** The role of the author of a message in the conversation. */
enum LanguageModelMessageRole {
  "system" = "system",
  "user" = "user",
  "assistant" = "assistant",
}

/** The type of content within a message. */
enum LanguageModelMessageType {
  "text" = "text",
  "image" = "image",
  "audio" = "audio",
}

/**
 * The value associated with a message content part.
 * Can be an image source, audio data, raw buffer, or a simple string.
 */
type LanguageModelMessageValue =
  | ImageBitmapSource
  | AudioBuffer
  | BufferSource
  | string;

/**
 * A single part of a message's content, allowing for multimodal inputs.
 */
interface LanguageModelMessageContent {
  type: LanguageModelMessageType;
  value: LanguageModelMessageValue;
}

/**
 * Represents a message in the conversation history or a prompt input.
 */
interface LanguageModelMessage {
  role: LanguageModelMessageRole;
  /**
   * The content of the message.
   * A `string` is a shorthand for `[{ type: "text", value: providedValue }]`.
   */
  content: string | LanguageModelMessageContent[];
  /** If true, the message is a "prefix" to the current turn, potentially for in-context learning. */
  prefix?: boolean;
}

/**
 * The argument to the prompt() method and others like it.
 * Can be a sequence of messages or a string shorthand for a single user text message.
 */
type LanguageModelPrompt = LanguageModelMessage[] | string;

// ---

/** Defines expectations for inputs or outputs in a sequence. */
interface LanguageModelExpected {
  type: LanguageModelMessageType;
  languages?: string[];
}

/** Options shared between `create` and `availability` methods. */
interface LanguageModelCreateCoreOptions {
  /**
   * Controls the randomness of the output by selecting from the top K most likely tokens.
   * `unrestricted double` implies `number` in TS, allowing for special values like `Infinity`.
   */
  topK?: number;
  /**
   * Controls the creativity of the output, where higher is more diverse.
   * `unrestricted double` implies `number` in TS, allowing for special values like `Infinity`.
   */
  temperature?: number;

  expectedInputs?: LanguageModelExpected[];
  expectedOutputs?: LanguageModelExpected[];
  tools?: LanguageModelTool[];
}

/** Options for creating a LanguageModel instance. */
interface LanguageModelCreateOptions extends LanguageModelCreateCoreOptions {
  /** A signal to abort the creation process. */
  signal?: AbortSignal;
  /** A callback to monitor the creation process (type not fully specified in IDL, using a general function). */
  monitor?: (event: any) => void;
  /** Initial messages to pre-populate the model's context/history. */
  initialPrompts?: LanguageModelMessage[];
}

/** Options for prompting the model. */
interface LanguageModelPromptOptions {
  /** Specifies a desired structure or constraint for the response (e.g., a JSON schema). */
  responseConstraint?: object;
  /** Whether to omit the response constraint from the model's input context. */
  omitResponseConstraintInput?: boolean;
  /** A signal to abort the prompt operation. */
  signal?: AbortSignal;
}

/** Options for appending to the model's context. */
interface LanguageModelAppendOptions {
  /** A signal to abort the append operation. */
  signal?: AbortSignal;
}

/** Options for cloning a LanguageModel instance. */
interface LanguageModelCloneOptions {
  /** A signal to abort the clone operation. */
  signal?: AbortSignal;
}

/** Provides details about the model's parameters. */
interface LanguageModelParams {
  readonly defaultTopK: number;
  readonly maxTopK: number;
  readonly defaultTemperature: number;
  readonly maxTemperature: number;
}

/** Represents the availability status of a LanguageModel (IDL type not fully specified, using a placeholder). */
type Availability = 'available' | 'not-available' | 'restricted';

// ---

/**
 * The core interface for interacting with a Language Model.
 * Exposed on the Window and only available in Secure Contexts.
 * Inherits from EventTarget (e.g., for event handling like `onquotaoverflow`).
 */
declare interface LanguageModel extends EventTarget {
  /**
   * Creates a new LanguageModel instance.
   * @param options Configuration options.
   */
  create(
    options?: LanguageModelCreateOptions
  ): Promise<LanguageModel>;

  /**
   * Checks the availability of a LanguageModel, optionally with specific configuration requirements.
   * @param options Core configuration to check against.
   */
  availability(
    options?: LanguageModelCreateCoreOptions
  ): Promise<Availability>;

  /** Retrieves information about the model's parameters (e.g., default/max topK, temperature). */
  params(): Promise<LanguageModelParams | null>;

  /**
   * Generates a single, complete text response from the model.
   * Throws `NotSupportedError` if a message with `role = "system"` is included in the prompt.
   * @param input The prompt, as messages or a string.
   * @param options Options for the prompt operation.
   */
  prompt(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions
  ): Promise<string>;

  /**
   * Generates a streaming text response from the model.
   * Throws `NotSupportedError` if a message with `role = "system"` is included in the prompt.
   * @param input The prompt, as messages or a string.
   * @param options Options for the prompt operation.
   */
  promptStreaming(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions
  ): ReadableStream;

  /**
   * Appends a message to the model's internal context/history without generating an immediate response.
   * @param input The messages or string to append.
   * @param options Options for the append operation.
   */
  append(
    input: LanguageModelPrompt,
    options?: LanguageModelAppendOptions
  ): Promise<undefined>;

  /**
   * Estimates the cost/usage of a given input prompt before execution.
   * @param input The prompt to measure.
   * @param options Options for the prompt operation (influencing measurement).
   */
  measureInputUsage(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions
  ): Promise<number>;

  /** The usage cost/value of the input processed in the most recent operation. */
  readonly inputUsage: number;
  /** The available input quota (unrestricted double maps to number). */
  readonly inputQuota: number;
  /** Event handler for when the input quota is exceeded. */
  onquotaoverflow: ((this: LanguageModel, ev: Event) => any) | null;

  /** The configured top-K value for this model instance. */
  readonly topK: number;
  /** The configured temperature value for this model instance. */
  readonly temperature: number;

  /**
   * Creates a deep copy of the current LanguageModel instance.
   * @param options Options for the cloning process.
   */
  clone(options?: LanguageModelCloneOptions): Promise<LanguageModel>;

  /** Releases resources associated with this model instance. */
  destroy(): void;
}