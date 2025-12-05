import {
  Document,
  VectorStoreIndex,
  Settings,
  SentenceSplitter,
  BaseEmbedding,
  NodeWithScore,
  Metadata,
  MetadataMode,
  MessageContentDetail,
  storageContextFromDefaults,
} from "llamaindex";
import { FilesetResolver, TextEmbedder } from "@mediapipe/tasks-text";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { PGliteVectorStore, DocumentInfo } from "./pglite-vectore-store";

let modelPath =
  "https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite";

if (process.env.NODE_ENV === "development") {
  modelPath = "http://localhost:3000/models/universal_sentence_encoder.tflite";
}

class MediaPipeEmbedding extends BaseEmbedding {
  private embedder: TextEmbedder | null = null;

  constructor() {
    super();
  }

  async init() {
    const textFileset = await FilesetResolver.forTextTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-text@0.10.0/wasm"
    );
    this.embedder = await TextEmbedder.createFromOptions(textFileset, {
      baseOptions: {
        modelAssetPath: modelPath,
      },
    });
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) throw new Error("Embedder not initialized");
    const result = this.embedder.embed(text);
    return result.embeddings[0].floatEmbedding!;
  }

  async getQueryEmbedding(
    query: MessageContentDetail
  ): Promise<number[] | null> {
    // Extract text from MessageContentDetail
    let text: string = "";

    if (typeof query === "string") {
      text = query;
    } else if ("text" in query && typeof query.text === "string") {
      text = query.text;
    }

    if (!text) return null;
    return this.getTextEmbedding(text);
  }
}

// Singleton instances
let dbInstance: PGlite | null = null;
let vectorStoreInstance: PGliteVectorStore | null = null;
let embedModelInstance: MediaPipeEmbedding | null = null;

// Initialize the vector database (singleton pattern)
const initializeVectorDB = async (): Promise<{
  db: PGlite;
  vectorStore: PGliteVectorStore;
  embedModel: MediaPipeEmbedding;
}> => {
  if (dbInstance && vectorStoreInstance && embedModelInstance) {
    return {
      db: dbInstance,
      vectorStore: vectorStoreInstance,
      embedModel: embedModelInstance,
    };
  }

  console.log("Initializing vector database...");

  // Initialize PGlite with persistence
  dbInstance = new PGlite("idb://buddhi-ai-embeddings", {
    extensions: { vector },
  });
  await dbInstance.waitReady;

  // Initialize embedder FIRST (before vector store)
  embedModelInstance = new MediaPipeEmbedding();
  await embedModelInstance.init();

  // Set global settings BEFORE creating vector store
  Settings.embedModel = embedModelInstance;
  Settings.llm = undefined as any;

  // Now initialize vector store (it will use Settings.embedModel)
  vectorStoreInstance = new PGliteVectorStore(dbInstance);
  await vectorStoreInstance.initializeSchema();

  console.log("Vector database initialized successfully");

  return {
    db: dbInstance,
    vectorStore: vectorStoreInstance,
    embedModel: embedModelInstance,
  };
};

// Breaks raw text into manageable nodes (chunks) with overlap
const chunkText = async (
  rawText: string,
  chunkSize = 200,
  chunkOverlap = 20,
  documentId?: string
) => {
  const splitter = new SentenceSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });

  // Wrap raw text in a Document object
  const document = new Document({
    text: rawText,
    id_: documentId || `doc_${Date.now()}`,
  });

  // Get nodes (chunks)
  const nodes = await splitter.getNodesFromDocuments([document]);

  console.log(`\n--- Chunking Result: Created ${nodes.length} chunks ---`);
  nodes.forEach((node, idx) => {
    console.log(
      `[Chunk ${idx}]: ${node
        .getContent(MetadataMode.NONE)
        .substring(0, 50)}...`
    );
  });

  return nodes;
};

// Create vector index with chat context
const createVectorIndex = async (
  nodes: any[],
  chatId: string,
  documentId: string,
  fileName: string
) => {
  const { vectorStore, embedModel } = await initializeVectorDB();

  console.log("\n--- Generating Embeddings & Indexing ---");

  // Create a storage context connecting LlamaIndex to our PGlite instance
  const storageContext = await storageContextFromDefaults({ vectorStore });

  // Convert nodes to documents and create index
  const documents = nodes.map(
    (n) => new Document({ text: n.text, metadata: n.metadata })
  );

  // Create index (this generates embeddings)
  const index = await VectorStoreIndex.fromDocuments(documents, {
    storageContext,
  });

  // Get the nodes with embeddings from the index
  const indexNodes = await index.asRetriever().retrieve({ query: "" });

  // Store with chat context using our custom method
  await vectorStore.addWithChatContext(
    indexNodes.map((n) => n.node),
    chatId,
    documentId,
    fileName
  );

  console.log(
    `Stored ${indexNodes.length} chunks for document ${fileName} in chat ${chatId}`
  );

  return index;
};

// Retrieve segments for a specific chat
async function retrieveSegments(
  chatId: string,
  query: string,
  topK = 3
): Promise<NodeWithScore<Metadata>[]> {
  console.log(`\n--- Retrieving for query: "${query}" in chat ${chatId} ---`);

  const { vectorStore, embedModel } = await initializeVectorDB();

  // Get query embedding
  const queryEmbedding = await embedModel.getTextEmbedding(query);

  if (!queryEmbedding) {
    console.error("Failed to generate query embedding");
    return [];
  }

  // Query with chat filter
  const results = await vectorStore.queryByChatId(
    {
      queryEmbedding,
      similarityTopK: topK,
      mode: "default" as any,
    },
    chatId
  );

  // Display Results
  if (results.nodes) {
    results.nodes.forEach((node, i) => {
      console.log(
        `\nResult #${i + 1} (Score: ${results.similarities[i]?.toFixed(4)})`
      );
      console.log(`Text: "${node.getContent(MetadataMode.NONE)}"`);
    });

    return results.nodes.map((node, i) => ({
      node,
      score: results.similarities[i],
    }));
  }

  return [];
}

// Delete document embeddings
async function deleteDocumentEmbeddings(documentId: string): Promise<void> {
  const { vectorStore } = await initializeVectorDB();
  await vectorStore.deleteByDocumentId(documentId);
  console.log(`Deleted all embeddings for document ${documentId}`);
}

// Get document list for a chat
async function getDocumentList(chatId: string): Promise<DocumentInfo[]> {
  const { vectorStore } = await initializeVectorDB();
  return await vectorStore.getDocumentsByChatId(chatId);
}

export {
  chunkText,
  createVectorIndex,
  retrieveSegments,
  initializeVectorDB,
  deleteDocumentEmbeddings,
  getDocumentList,
};
