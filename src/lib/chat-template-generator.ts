import { Prompt } from "@mediapipe/tasks-genai";

type BuddhiAIChatRole = "system" | "user" | "assistant";

type BuddhiAIContentType = "text" | "image" | "audio";

interface BuddhiAIChatTemplate {
  type: BuddhiAIContentType;
  text?: string;
  url?: string;
  mediaType?: string;
  fileName?: string;
}

interface BuddhiAIMessage {
  role: BuddhiAIChatRole;
  content: BuddhiAIChatTemplate[] | string;
}

const generateChatTemplate = async (
  messages: BuddhiAIMessage[]
): Promise<Prompt> => {
  return new Promise<Prompt>((resolve, reject) => {
    // system message
    const first_user_prefix =
      messages[0].role === "system" ? messages[0].content : null;
    const chatParts: Prompt = [];
    try {
      for (const message of messages) {
        let chat_template: Prompt = "";
        let role = "";
        if (message.role === "assistant" && messages.indexOf(message) === 0) {
          throw new Error(
            "The first message cannot be from the assistant role."
          );
        } else if (message.role === "assistant") {
          role = "model";
        } else {
          role = message.role;
        }

        if (messages.indexOf(message) === 0 && first_user_prefix) {
          chat_template = `<start_of_turn>${role}
        ${first_user_prefix}
        <end_of_turn>\n`;
          chatParts.push(chat_template);
          continue;
        } else if (
          message.role === "user" &&
          typeof message.content === "string"
        ) {
          chat_template = `<start_of_turn>${role}
        ${message.content.trim()}
        <end_of_turn>\n`;
          chatParts.push(chat_template);
          continue;
        } else if (message.role === "user" && Array.isArray(message.content)) {
          for (const contentItem of message.content) {
            if (contentItem.type === "text" && contentItem.text) {
              chat_template = `<start_of_turn>${role}
            ${contentItem.text.trim()}\n`;
              chatParts.push(chat_template);
            } else if (contentItem.type === "image" && contentItem.url) {
              chat_template = { imageSource: contentItem.url };
              chatParts.push(chat_template);
            } else if (contentItem.type === "audio" && contentItem.url) {
              chat_template = { audioSource: contentItem.url };
              chatParts.push(chat_template);
            }
            chatParts.push("<end_of_turn>\n");
          }
          continue;
        } else if (
          message.role === "assistant" &&
          typeof message.content === "string"
        ) {
          chat_template = `<start_of_turn>${role}
        ${message.content.trim()}
        <end_of_turn>\n`;
          chatParts.push(chat_template);
          continue;
        }
      }

      chatParts.push("<start_of_turn>model\n");
    } catch (error) {
      console.error("Error generating chat template:", error);
      reject(error);
    }
    resolve(chatParts);
  });
};

export { generateChatTemplate };
export type { BuddhiAIMessage, BuddhiAIChatRole, BuddhiAIChatTemplate };

