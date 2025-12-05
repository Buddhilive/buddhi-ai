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
  TextNode,
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
let initializationPromise: Promise<{
  db: PGlite;
  vectorStore: PGliteVectorStore;
  embedModel: MediaPipeEmbedding;
}> | null = null;

// Initialize the vector database (singleton pattern with race condition protection)
const initializeVectorDB = async (): Promise<{
  db: PGlite;
  vectorStore: PGliteVectorStore;
  embedModel: MediaPipeEmbedding;
}> => {
  // If already initialized, return immediately
  if (dbInstance && vectorStoreInstance && embedModelInstance) {
    return {
      db: dbInstance,
      vectorStore: vectorStoreInstance,
      embedModel: embedModelInstance,
    };
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization and store the promise
  initializationPromise = (async () => {
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
  })();

  return initializationPromise;
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

  // Convert nodes to BaseNode objects with embeddings
  const nodesWithEmbeddings: TextNode[] = [];

  for (const node of nodes) {
    // Generate embedding for this node
    const embedding = await embedModel.getTextEmbedding(node.text);

    // Create a TextNode with the embedding
    const textNode: TextNode = new TextNode({
      text: node.text,
      metadata: node.metadata || {},
      id_: node.id_ || `${documentId}_chunk_${nodesWithEmbeddings.length}`,
    });

    // Set the embedding on the node
    textNode.embedding = embedding;

    nodesWithEmbeddings.push(textNode);
  }

  console.log(`Generated embeddings for ${nodesWithEmbeddings.length} chunks`);

  // Store with chat context using our custom method
  await vectorStore.addWithChatContext(
    nodesWithEmbeddings,
    chatId,
    documentId,
    fileName
  );

  console.log(
    `Stored ${nodesWithEmbeddings.length} chunks for document ${fileName} in chat ${chatId}`
  );

  // Return a mock index (we don't actually need it since we're storing directly)
  return { documentId, fileName, chunkCount: nodesWithEmbeddings.length };
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
