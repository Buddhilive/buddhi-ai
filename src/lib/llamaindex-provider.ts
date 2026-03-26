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
import * as LiteRT from "@litertjs/core";
import { AutoTokenizer } from "@huggingface/transformers";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { PGliteVectorStore, DocumentInfo } from "./pglite-vectore-store";

// ─── Cache helpers ────────────────────────────────────────────────────────────
// Must mirror the constants in model-manager.ts / model-download-worker.ts

const BUDDHI_CACHE_NAME = "buddhi-ai-models-cache-v1";
const EMBEDDING_MODEL_ID = "litert-community/embeddinggemma-300m";

async function getEmbeddingModelURL(): Promise<string> {
  const key = `https://cache.buddhi-ai.local/models/${EMBEDDING_MODEL_ID.replace(/\//g, "_")}`;
  const cache = await caches.open(BUDDHI_CACHE_NAME);
  const response = await cache.match(new Request(key));
  if (!response) {
    throw new Error(
      'Embedding model not installed. Install "Embedding Gemma 300M" from the Models page.'
    );
  }
  return URL.createObjectURL(await response.blob());
}

// ─── LiteRT embedding class ───────────────────────────────────────────────────

const LITERTJS_WASM_PATH = "https://cdn.jsdelivr.net/npm/@litertjs/core/wasm/";
const SEQ_LEN = 2048;
const DOC_PREFIX = "title: none | text: ";

class LiteRTEmbedding extends BaseEmbedding {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tokenizer: any = null;

  constructor() {
    super();
  }

  async init() {
    // Load LiteRT WASM runtime — auto-detects WebGPU when available.
    await LiteRT.loadLiteRt(LITERTJS_WASM_PATH);

    // Load tokenizer from HuggingFace (transformers.js caches it)
    this.tokenizer = await AutoTokenizer.from_pretrained(
      "onnx-community/embeddinggemma-300m-ONNX"
    );

    // Load model blob from Cache API
    const objectUrl = await getEmbeddingModelURL();
    try {
      this.model = await LiteRT.loadAndCompile(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    if (!this.model || !this.tokenizer) throw new Error("Embedder not initialized");
    const prefixed = DOC_PREFIX + text;
    const tokens = await this.tokenizer(prefixed, {
      padding: "max_length",
      max_length: SEQ_LEN,
      truncation: true,
      return_tensors: "np",
    });
    // transformers.js v3 returns token IDs as BigInt64Array.
    // Explicit conversion to Int32Array is required before creating a LiteRT tensor.
    const rawIds = tokens.input_ids.data as BigInt64Array | Int32Array;
    const int32Ids = new Int32Array(rawIds.length);
    for (let i = 0; i < rawIds.length; i++) {
      int32Ids[i] = Number(rawIds[i]);
    }
    // Use LiteRT native API — bypasses TF.js interop entirely.
    // Tensor.fromTypedArray creates a HOST_MEMORY (CPU) input tensor.
    // LiteRT auto-copies it to WebGPU (via ensureInputsOnAccelerator) if needed.
    // Output .data() auto-copies from WebGPU back to CPU before returning.
    const env = LiteRT.getDefaultEnvironment();
    const inputTensor = LiteRT.Tensor.fromTypedArray(int32Ids, [1, SEQ_LEN], env);
    const outputs = await this.model.run([inputTensor]);
    const embedding = Array.from(await outputs[0].data() as Float32Array);
    inputTensor.delete();
    outputs[0].delete();
    return embedding;
  }

  async getQueryEmbedding(
    query: MessageContentDetail
  ): Promise<number[] | null> {
    let text = "";
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
let embedModelInstance: LiteRTEmbedding | null = null;
let initializationPromise: Promise<{
  db: PGlite;
  vectorStore: PGliteVectorStore;
  embedModel: LiteRTEmbedding;
}> | null = null;

// Initialize the vector database (singleton pattern with race condition protection)
const initializeVectorDB = async (): Promise<{
  db: PGlite;
  vectorStore: PGliteVectorStore;
  embedModel: LiteRTEmbedding;
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
    // console.log("Initializing vector database...");

    // Initialize PGlite with persistence
    // v2: schema bumped to 768-dim vectors (EmbeddingGemma)
    dbInstance = new PGlite("idb://buddhi-ai-embeddings-v2", {
      extensions: { vector },
    });
    await dbInstance.waitReady;

    // Initialize embedder FIRST (before vector store)
    embedModelInstance = new LiteRTEmbedding();
    await embedModelInstance.init();

    // Set global settings BEFORE creating vector store
    Settings.embedModel = embedModelInstance!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Settings.llm = undefined as any;

    // Now initialize vector store (it will use Settings.embedModel)
    vectorStoreInstance = new PGliteVectorStore(dbInstance);
    await vectorStoreInstance.initializeSchema();

    // console.log("Vector database initialized successfully");

    return {
      db: dbInstance,
      vectorStore: vectorStoreInstance,
      embedModel: embedModelInstance!,
    };
  })();

  return initializationPromise!;
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

  // console.log(`\n--- Chunking Result: Created ${nodes.length} chunks ---`);
  nodes.forEach((node, idx) => {
    /* console.log(
      `[Chunk ${idx}]: ${node
        .getContent(MetadataMode.NONE)
        .substring(0, 50)}...`
    ); */
  });

  return nodes;
};

// Create vector index with chat context
const createVectorIndex = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[],
  chatId: string,
  documentId: string,
  fileName: string
) => {
  const { vectorStore, embedModel } = await initializeVectorDB();

  // console.log("\n--- Generating Embeddings & Indexing ---");

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

  // console.log(`Generated embeddings for ${nodesWithEmbeddings.length} chunks`);

  // Store with chat context using our custom method
  await vectorStore.addWithChatContext(
    nodesWithEmbeddings,
    chatId,
    documentId,
    fileName
  );

  /* console.log(
    `Stored ${nodesWithEmbeddings.length} chunks for document ${fileName} in chat ${chatId}`
  ); */

  // Return a mock index (we don't actually need it since we're storing directly)
  return { documentId, fileName, chunkCount: nodesWithEmbeddings.length };
};

// Retrieve segments — omit chatId to query the global knowledge base
async function retrieveSegments(
  query: string,
  topK = 3,
  chatId?: string
): Promise<
  Array<{
    node: NodeWithScore<Metadata>;
    fileName: string;
    documentId: string;
  }>
> {
  const { vectorStore, embedModel } = await initializeVectorDB();

  // Get query embedding
  const queryEmbedding = await embedModel.getTextEmbedding(query);

  if (!queryEmbedding) {
    console.error("Failed to generate query embedding");
    return [];
  }

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  if (chatId) {
    result = await vectorStore.client.query(
      `SELECT id, text, metadata, fileName, documentId, 1 - (embedding <=> $1) as score
       FROM embeddings
       WHERE chatId = $3
       ORDER BY embedding <=> $1
       LIMIT $2`,
      [vectorStr, topK, chatId]
    );
  } else {
    result = await vectorStore.client.query(
      `SELECT id, text, metadata, fileName, documentId, 1 - (embedding <=> $1) as score
       FROM embeddings
       ORDER BY embedding <=> $1
       LIMIT $2`,
      [vectorStr, topK]
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = result.rows.map((row: any) => {
    // PGlite returns JSONB as object, not string
    const metadata =
      typeof row.metadata === "string"
        ? JSON.parse(row.metadata)
        : row.metadata || {};

    const textNode = new TextNode({
      text: row.text,
      metadata: metadata,
      id_: row.id,
    });

    return {
      node: {
        node: textNode,
        score: row.score,
      },
      fileName: row.filename,
      documentId: row.documentid,
    };
  });

  return results;
}

// Delete document embeddings
async function deleteDocumentEmbeddings(documentId: string): Promise<void> {
  const { vectorStore } = await initializeVectorDB();
  await vectorStore.deleteByDocumentId(documentId);
  // console.log(`Deleted all embeddings for document ${documentId}`);
}

// Get document list for a chat
async function getDocumentList(chatId: string): Promise<DocumentInfo[]> {
  const { vectorStore } = await initializeVectorDB();
  return await vectorStore.getDocumentsByChatId(chatId);
}

// Check if any documents exist — omit chatId to check the global knowledge base
async function hasDocuments(chatId?: string): Promise<boolean> {
  try {
    const { vectorStore } = await initializeVectorDB();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    if (chatId) {
      result = await vectorStore.client.query(
        "SELECT COUNT(*) as count FROM embeddings WHERE chatId = $1",
        [chatId]
      );
    } else {
      result = await vectorStore.client.query(
        "SELECT COUNT(*) as count FROM embeddings"
      );
    }
    return parseInt(result.rows[0].count) > 0;
  } catch {
    return false;
  }
}

// Create vector index in batches to avoid memory pressure from large documents
const createVectorIndexBatched = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: any[],
  chatId: string,
  documentId: string,
  fileName: string,
  onBatch?: (processed: number, total: number) => void,
  batchSize = 50
): Promise<{ documentId: string; fileName: string; chunkCount: number }> => {
  const { vectorStore, embedModel } = await initializeVectorDB();
  const total = nodes.length;
  let processed = 0;

  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    const batchNodes: TextNode[] = [];

    for (const node of batch) {
      const embedding = await embedModel.getTextEmbedding(node.text);
      const textNode = new TextNode({
        text: node.text,
        metadata: node.metadata || {},
        id_: node.id_ || `${documentId}_chunk_${processed + batchNodes.length}`,
      });
      textNode.embedding = embedding;
      batchNodes.push(textNode);
    }

    await vectorStore.addWithChatContext(batchNodes, chatId, documentId, fileName);
    processed += batchNodes.length;
    onBatch?.(processed, total);
  }

  return { documentId, fileName, chunkCount: total };
};

export {
  chunkText,
  createVectorIndex,
  createVectorIndexBatched,
  retrieveSegments,
  initializeVectorDB,
  deleteDocumentEmbeddings,
  getDocumentList,
  hasDocuments,
};
