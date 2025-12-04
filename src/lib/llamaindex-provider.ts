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
import { PGliteVectorStore } from "./pglite-vectore-store";

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

// Breaks raw text into manageable nodes (chunks) with overlap
const chunkText = async (
  rawText: string,
  chunkSize = 200,
  chunkOverlap = 20
) => {
  const splitter = new SentenceSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });

  // Wrap raw text in a Document object
  const document = new Document({ text: rawText, id_: "doc_1" });

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

const createVectorIndex = async (nodes: any[]) => {
  // Initialize our custom MediaPipe embedder
  const embedModel = new MediaPipeEmbedding();
  await embedModel.init();

  // Set Global Settings
  // IMPT: We explicitly do NOT set an LLM here to ensure one isn't used.
  Settings.embedModel = embedModel;
  Settings.llm = undefined as any; // Force disable LLM

  console.log("\n--- Generating Embeddings & Indexing ---");

  const db = new PGlite("idb://buddhi-ai-embeddings", {
    extensions: { vector },
  });
  await db.waitReady; // Ensure WASM is loaded
  await db.query(`
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      chatId TEXT,
      text TEXT,
      metadata JSONB,
      embedding vector(512)
    );
  `);
  console.log("DB initialized with persistence.", db);
  const vectorStore = new PGliteVectorStore(db);

  // Create a storage context connecting LlamaIndex to our PGlite instance
  const storageContext = await storageContextFromDefaults({ vectorStore });
  // VectorStoreIndex.fromDocuments with custom storage:
  // 1. Calculates embeddings using Settings.embedModel
  // 2. Stores them in our PGliteVectorStore
  const index = await VectorStoreIndex.fromDocuments(
    nodes.map((n) => new Document({ text: n.text, metadata: n.metadata })),
    { storageContext }
  );

  return index;
};

async function retrieveSegments(
  index: VectorStoreIndex,
  query: string,
  topK = 3
) {
  console.log(`\n--- Retrieving for query: "${query}" ---`);

  // Create a retriever, NOT a query engine.
  // A retriever simply fetches nodes; it does not synthesize answers.
  const retriever = index.asRetriever({ similarityTopK: topK });

  const results: NodeWithScore<Metadata>[] = await retriever.retrieve({
    query: query,
  });

  // Display Results
  results.forEach((result, i) => {
    console.log(`\nResult #${i + 1} (Score: ${result.score?.toFixed(4)})`);
    console.log(`Text: "${result.node.getContent(MetadataMode.NONE)}"`);
  });

  return results;
}

export { chunkText, createVectorIndex, retrieveSegments };
