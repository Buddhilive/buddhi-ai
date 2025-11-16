import { webSearch } from "./web-search";

export const BUDDHI_TOOLS = [
  {
    name: "search_tool",
    description: "Search information from the web to answer user's questions.",
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
    async execute({ query }: { query: string }) {
      console.log("Executing web search with query:", query);
      const res = await webSearch({ query });
      return JSON.stringify(res);
    },
  },
];

export const TEMP_TOOLS = {
  webSearch
};