import { functionCallSchema } from "@/schema/output";
import { TEMP_TOOLS } from "@/tools/tools";
import { ChatCompletionRequest, ChatCompletionResponse } from "@/types/chat";

export const chatApi = {
  async getCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const languageModel: LanguageModel = (window as any).LanguageModel;
      const systemMessage: LanguageModelMessage = {
        role: "system" as LanguageModelMessageRole,
        content: `You are Buddhi AI, a helpful assistant developed by Buddhi LIVE Labs.
          Your response MUST be a JSON object 
      that strictly adheres to the provided JSON schema. DO NOT include any other text or markdown outside of the JSON.
      
      - If the user asks a question that requires real-time information or external knowledge 
        (e.g., current events, facts, etc.), set 'action' to 'call_tool' and populate the 
        'tool_call' object with a query for the 'webSearch' tool.
        
      - If the user asks a greeting, small talk, or a simple conversational query (e.g., "Hi", 
        "How are you?"), set 'action' to 'respond_naturally' and provide the immediate, natural 
        text in the 'natural_response' field. DO NOT use the tool_call object in this case.`,
      };

      request.initialMessages?.unshift(systemMessage);

      const session = await languageModel.create({
        initialPrompts: request.initialMessages,
      });

      console.log("Session created with initial messages:", session);

      /* This Temporary manual tool call implementation will be used until Chrome Build-in AI tool callings is stable */
      const result = await session.prompt(request.prompt, {
        responseConstraint: functionCallSchema,
      });

      const structuredResponse = JSON.parse(result);

      console.log("Structured response from model:", structuredResponse);

      if (structuredResponse.action === "respond_naturally") {
        // Small talk detected: return the model's pre-written natural response
        console.log("Model chose to respond naturally.");
        return { message: structuredResponse.natural_response };
      }

      if (structuredResponse.action === "call_tool") {
        const functionCall = structuredResponse.tool_call;

        const functionName = functionCall.name;
        const functionArgs = functionCall.arguments;

        console.log(
          `Tool Call Requested: ${functionName} with arguments:`,
          functionArgs
        );

        const toolFunction =
          TEMP_TOOLS[functionName as keyof typeof TEMP_TOOLS];
        if (toolFunction) {
          const toolResult = await toolFunction({
            query: functionArgs["query"],
          });
          console.log(
            `Tool Execution Result for ${functionArgs["query"]}:`,
            toolResult
          );

          const finalPrompt = `[CONTEXT]:
        ${toolResult}
        
        [QUESTION]:
        ${request.prompt}
        
        [INSTRUCTIONS]:
        Using the provided CONTEXT from the tool result, answer the user's QUESTION accurately. 
        If the CONTEXT does not contain relevant information, respond with "No relevant information found."`;

          // Get the final, human-readable answer from the model
          const finalAnswer = await session.prompt(finalPrompt);

          return { message: finalAnswer };
        }
      }

      return { message: "Requested tool not found." };
    } catch (error) {
      console.error("Error getting AI response:", error);
      throw new Error("Failed to get AI response");
    }
  },
};
