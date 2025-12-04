import {
  BaseVectorStore,
  VectorStoreQuery,
  VectorStoreQueryResult,
} from "llamaindex/vector-store";
import { BaseNode, TextNode, Metadata, MetadataMode } from "llamaindex";

export interface DocumentInfo {
  documentId: string;
  fileName: string;
  chatId: string;
  chunkCount: number;
}

export class PGliteVectorStore extends BaseVectorStore {
  storesText: boolean = true;
  client: any; // The PGlite instance

  constructor(dbInstance: any) {
    super();
    this.client = dbInstance;
  }

  // Initialize the database schema with chatId and documentId support
  async initializeSchema(): Promise<void> {
    await this.client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        documentId TEXT NOT NULL,
        fileName TEXT NOT NULL,
        text TEXT,
        metadata JSONB,
        embedding vector(512)
      );
      CREATE INDEX IF NOT EXISTS idx_embeddings_chatId ON embeddings(chatId);
      CREATE INDEX IF NOT EXISTS idx_embeddings_documentId ON embeddings(documentId);
    `);
  }

  // Add nodes with chatId and documentId context
  async addWithChatContext(
    nodes: BaseNode<Metadata>[],
    chatId: string,
    documentId: string,
    fileName: string
  ): Promise<string[]> {
    for (const node of nodes) {
      const embedding = node.getEmbedding();
      const text = node.getContent(MetadataMode.ALL);
      const metadata = JSON.stringify(node.metadata);
      const vectorStr = `[${embedding.join(",")}]`;

      await this.client.query(
        `INSERT INTO embeddings (id, chatId, documentId, fileName, text, metadata, embedding) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE 
         SET chatId = $2, documentId = $3, fileName = $4, text = $5, metadata = $6, embedding = $7`,
        [node.id_, chatId, documentId, fileName, text, metadata, vectorStr]
      );
    }
    return nodes.map((n) => n.id_);
  }

  // Legacy add method (for backward compatibility)
  async add(nodes: BaseNode<Metadata>[]): Promise<string[]> {
    console.warn(
      "Using legacy add() method. Consider using addWithChatContext() instead."
    );
    for (const node of nodes) {
      const embedding = node.getEmbedding();
      const text = node.getContent(MetadataMode.ALL);
      const metadata = JSON.stringify(node.metadata);
      const vectorStr = `[${embedding.join(",")}]`;

      await this.client.query(
        `INSERT INTO embeddings (id, chatId, documentId, fileName, text, metadata, embedding) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET text = $5, metadata = $6, embedding = $7`,
        [node.id_, "default", "default", "unknown", text, metadata, vectorStr]
      );
    }
    return nodes.map((n) => n.id_);
  }

  // Query nodes filtered by chatId
  async queryByChatId(
    query: VectorStoreQuery,
    chatId: string
  ): Promise<VectorStoreQueryResult> {
    const embedding = query.queryEmbedding;
    const topK = query.similarityTopK;
    const vectorStr = `[${embedding!.join(",")}]`;

    const result = await this.client.query(
      `SELECT id, text, metadata, 1 - (embedding <=> $1) as score
       FROM embeddings
       WHERE chatId = $3
       ORDER BY embedding <=> $1
       LIMIT $2`,
      [vectorStr, topK, chatId]
    );

    const nodes = result.rows.map((row: any) => ({
      id_: row.id,
      text: row.text,
      metadata: row.metadata,
      score: row.score,
    }));

    return {
      nodes: nodes.map(
        (n: any) =>
          new TextNode({
            text: n.text,
            metadata: JSON.parse(n.metadata),
            id_: n.id_,
          })
      ),
      similarities: nodes.map((n: any) => n.score),
      ids: nodes.map((n: any) => n.id_),
    };
  }

  // Legacy query method (queries all chats)
  async query(query: VectorStoreQuery): Promise<VectorStoreQueryResult> {
    const embedding = query.queryEmbedding;
    const topK = query.similarityTopK;
    const vectorStr = `[${embedding!.join(",")}]`;

    const result = await this.client.query(
      `SELECT id, text, metadata, 1 - (embedding <=> $1) as score
       FROM embeddings
       ORDER BY embedding <=> $1
       LIMIT $2`,
      [vectorStr, topK]
    );

    const nodes = result.rows.map((row: any) => ({
      id_: row.id,
      text: row.text,
      metadata: row.metadata,
      score: row.score,
    }));

    return {
      nodes: nodes.map(
        (n: any) =>
          new TextNode({
            text: n.text,
            metadata: JSON.parse(n.metadata),
            id_: n.id_,
          })
      ),
      similarities: nodes.map((n: any) => n.score),
      ids: nodes.map((n: any) => n.id_),
    };
  }

  // Delete all embeddings for a specific document
  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.client.query("DELETE FROM embeddings WHERE documentId = $1", [
      documentId,
    ]);
  }

  // Get list of documents for a specific chat
  async getDocumentsByChatId(chatId: string): Promise<DocumentInfo[]> {
    const result = await this.client.query(
      `SELECT documentId, fileName, chatId, COUNT(*) as chunkCount
       FROM embeddings
       WHERE chatId = $1
       GROUP BY documentId, fileName, chatId`,
      [chatId]
    );

    return result.rows.map((row: any) => ({
      documentId: row.documentid,
      fileName: row.filename,
      chatId: row.chatid,
      chunkCount: parseInt(row.chunkcount),
    }));
  }

  // Delete single embedding by id
  async delete(refDocId: string): Promise<void> {
    await this.client.query("DELETE FROM embeddings WHERE id = $1", [refDocId]);
  }
}
