import { tool } from "ai";
import z from "zod";

export const createTools = () => ({
    randomNumber: tool({
        description: "Generate a random integer between min and max (inclusive).",
        inputSchema: z.object({
            min: z.number().describe("The minimum value (inclusive)"),
            max: z.number().describe("The maximum value (inclusive)"),
        }),
        execute: async ({ min, max }) => {
            return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
        },
    }),
});