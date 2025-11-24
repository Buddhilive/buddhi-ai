import {
  addItemToStore,
  initializeDB,
  updateItemInStore,
} from "@/lib/indexeddb";
import { BuddhiAIMessage } from "./chat-template-generator";

export interface BuddhiAISavedChat {
  id: string;
  title?: string;
  messages: BuddhiAIMessage[];
}

const initChatManager = async (): Promise<IDBDatabase> => {
  try {
    const idb = await initializeDB("buddhi-ai-database", 1, [
      { name: "chats" },
    ]);
    return idb;
  } catch (error) {
    console.error("Failed to initialize chat manager:", error);
    throw error;
  }
};

const saveOrUpdateChatMessages = async (
  idb: IDBDatabase,
  chatId: string,
  messages: BuddhiAIMessage[],
  title?: string,
  isNewChat: boolean = false
): Promise<void> => {
  try {
    const chatData: BuddhiAISavedChat = {
      id: chatId,
      title,
      messages,
    };

    if (isNewChat) {
      await addItemToStore<BuddhiAISavedChat>(idb, "chats", chatData, chatId);
    } else {
      await updateItemInStore<BuddhiAISavedChat>(
        idb,
        "chats",
        chatData,
        chatId
      );
    }
  } catch (error) {
    console.error("Failed to save or update chat messages:", error);
    throw error;
  }
};

export { initChatManager, saveOrUpdateChatMessages };
