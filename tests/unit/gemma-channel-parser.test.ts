/**
 * tests/unit/gemma-channel-parser.test.ts
 *
 * Unit tests for GemmaChannelStreamParser and argument parser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GemmaChannelStreamParser,
  parseGemmaToolArguments,
} from "../../src/lib/buddhi-ai-core/gemma-channel-parser.ts";

describe("GemmaChannelStreamParser", () => {
  it("correctly parses fragmented thought tokens without tag leakage", () => {
    let reasoning = "";
    let text = "";
    let reasoningStartCount = 0;
    let reasoningEndCount = 0;

    const parser = new GemmaChannelStreamParser({
      onReasoningStart: () => {
        reasoningStartCount++;
      },
      onReasoningDelta: (delta) => {
        reasoning += delta;
      },
      onReasoningEnd: () => {
        reasoningEndCount++;
      },
      onTextDelta: (delta) => {
        text += delta;
      },
    }, true);

    // Feed the exact fragmented thought stream reported by user
    const chunks = [
      "<|channel>thought Process<channel|> ",
      "<|channel>thought :<channel|> ",
      "<|channel>thought\n\n<channel|> ",
      "<|channel>thought 1<channel|> ",
      "<|channel>thought .<channel|> ",
      "Here is the final response to the user.",
    ];

    for (const chunk of chunks) {
      parser.push(chunk);
    }
    parser.flush();

    // Verify control tags are NOT in reasoning or text
    assert.equal(reasoning.includes("<|channel>"), false, "Reasoning must not contain opening tag");
    assert.equal(reasoning.includes("<channel|>"), false, "Reasoning must not contain closing tag");
    assert.equal(text.includes("<|channel>"), false, "Text must not contain opening tag");
    assert.equal(text.includes("<channel|>"), false, "Text must not contain closing tag");

    // CRITICAL: Must be called EXACTLY ONCE to prevent repeating Reasoning components
    assert.equal(reasoningStartCount, 1, "onReasoningStart should be called exactly once");
    assert.equal(reasoningEndCount, 1, "onReasoningEnd should be called exactly once");
    assert.equal(text.trim(), "Here is the final response to the user.");
  });

  it("suppresses thoughts when reasoning mode is OFF", () => {
    let reasoning = "";
    let text = "";

    const parser = new GemmaChannelStreamParser({
      onReasoningDelta: (delta) => {
        reasoning += delta;
      },
      onTextDelta: (delta) => {
        text += delta;
      },
    }, false); // reasoning OFF

    parser.push("<|channel>thought\nThinking quietly...<channel|>\nVisible answer.");
    parser.flush();

    assert.equal(reasoning, "", "No reasoning should be emitted when reasoning is off");
    assert.equal(text.trim(), "Visible answer.");
    assert.equal(text.includes("Thinking"), false, "Thinking must not leak into text");
  });

  it("handles tags split across streaming chunk boundaries", () => {
    let reasoning = "";
    let text = "";

    const parser = new GemmaChannelStreamParser({
      onReasoningDelta: (delta) => {
        reasoning += delta;
      },
      onTextDelta: (delta) => {
        text += delta;
      },
    }, true);

    // Split across '<|chan' and 'nel>thought'
    parser.push("Intro ");
    parser.push("<|chan");
    parser.push("nel>thought ");
    parser.push("deep thinking ");
    parser.push("<chan");
    parser.push("nel|>Outro");
    parser.flush();

    assert.equal(reasoning.trim(), "deep thinking");
    assert.equal(text.trim(), "Intro Outro");
  });

  it("parses Gemma 4 tool call with <|\"|> delimiters", () => {
    let capturedToolName = "";
    let capturedArgs: Record<string, unknown> = {};

    const parser = new GemmaChannelStreamParser({
      onToolCall: (call) => {
        capturedToolName = call.name;
        capturedArgs = call.args;
      },
    }, true);

    parser.push(
      `<|channel>call:write_file{path:<|"|>src/app/page.tsx<|"|>,content:<|"|>export default function Page() { return <h1>Hello</h1>; }<|"|>}<channel|>`
    );
    parser.flush();

    assert.equal(capturedToolName, "write_file");
    assert.equal(capturedArgs.path, "src/app/page.tsx");
    assert.equal(
      capturedArgs.content,
      "export default function Page() { return <h1>Hello</h1>; }"
    );
  });

  it("parses Gemma 4 tool call with <|tool_call> tags", () => {
    let capturedToolName = "";
    let capturedArgs: Record<string, unknown> = {};

    const parser = new GemmaChannelStreamParser({
      onToolCall: (call) => {
        capturedToolName = call.name;
        capturedArgs = call.args;
      },
    }, true);

    parser.push(
      `<|tool_call>call:run_command{command:<|"|>npm install<|"|>}<tool_call|>`
    );
    parser.flush();

    assert.equal(capturedToolName, "run_command");
    assert.equal(capturedArgs.command, "npm install");
  });

  it("preserves spaces between words in fragmented thought stream", () => {
    let reasoning = "";

    const parser = new GemmaChannelStreamParser({
      onReasoningDelta: (delta) => {
        reasoning += delta;
      },
    }, true);

    // Stream the exact sequence shown in the user's screenshot
    const tokens = [
      "<|channel>thought The<channel|>",
      "<|channel>thought user<channel|>",
      "<|channel>thought wants<channel|>",
      "<|channel>thought to<channel|>",
      "<|channel>thought rename<channel|>",
      "<|channel>thought something<channel|>",
      "<|channel>thought to<channel|>",
      '<|channel>thought "BuddhiKavindra"<channel|>',
      "<|channel>thought.<channel|>",
      "<|channel>thought S:<channel|>",
    ];

    for (const t of tokens) {
      parser.push(t);
    }
    parser.flush();

    assert.equal(
      reasoning.trim(),
      'The user wants to rename something to "BuddhiKavindra". S:'
    );
  });
});

describe("parseGemmaToolArguments", () => {
  it("parses standard JSON", () => {
    const res = parseGemmaToolArguments('{"command":"npm install","flag":true}');
    assert.deepEqual(res, { command: "npm install", flag: true });
  });

  it("parses Gemma 4 <|\"|> formatted arguments", () => {
    const res = parseGemmaToolArguments('{path:<|"|>src/app/page.tsx<|"|>,content:<|"|>Hello<|"|>}');
    assert.equal(res.path, "src/app/page.tsx");
    assert.equal(res.content, "Hello");
  });
});
