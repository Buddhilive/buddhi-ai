export const functionCallSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      description:
        "The intended action: Respond naturally for small talk or greetings and call the tool for information retrieval.",
      enum: ["call_tool", "respond_naturally"],
      required: true,
    },
    tool_call: {
      type: "object",
      description:
        "The function call details, ONLY required if action is 'call_tool'.",
      properties: {
        name: {
          type: "string",
          description: "The name of the function to be called.",
          enum: ["webSearch"],
        },
        arguments: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The exact search query to execute (e.g., 'current time in London').",
            },
          },
          required: ["query"],
        },
      },
      required: ["name", "arguments"],
    },
    natural_response: {
      type: "string",
      description:
        "The natural language response text, ONLY required if action is 'respond_naturally'.",
    },
  },
  required: ["action"],
};
