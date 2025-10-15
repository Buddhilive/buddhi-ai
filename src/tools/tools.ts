import { webSearch } from "./web-search";

export const BUDDHI_TOOLS: LanguageModelTool[] = [
  {
    name: "webSearch",
    description: "Search the web for if the user ask a question.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
      },
      required: ["query"],
    },
    async execute({ query }) {
      const res = await webSearch({ query });
      return JSON.stringify(res);
    },
  },
];
