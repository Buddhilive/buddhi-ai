import {
  BaseVectorStore,
  VectorStoreQuery,
  VectorStoreQueryResult,
} from "llamaindex/vector-store";
import { BaseNode, TextNode, Metadata, MetadataMode } from "llamaindex";

export class PGliteVectorStore extends BaseVectorStore {
  storesText: boolean = true;
  client: any; // The PGlite instance

  constructor(dbInstance: any) {
    super();
    this.client = dbInstance;
  }

  // 1. Add Nodes (Documents) to PGlite
  async add(nodes: BaseNode<Metadata>[]): Promise<string[]> {
    for (const node of nodes) {
      const embedding = node.getEmbedding();
      const text = node.getContent(MetadataMode.ALL); // Get text content
      const metadata = JSON.stringify(node.metadata);

      // Format vector for pgvector SQL input: '[0.1, 0.2, ...]'
      const vectorStr = `[${embedding.join(",")}]`;

      await this.client.query(
        `INSERT INTO embeddings (id, text, metadata, embedding) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET text = $2, metadata = $3, embedding = $4`,
        [node.id_, text, metadata, vectorStr]
      );
    }
    return nodes.map((n) => n.id_);
  }

  // 2. Query Nodes using Vector Similarity
  async query(query: VectorStoreQuery): Promise<VectorStoreQueryResult> {
    const embedding = query.queryEmbedding;
    const topK = query.similarityTopK;
    const vectorStr = `[${embedding!.join(",")}]`;

    // Standard pgvector cosine similarity (<=> operator)
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
      ), // Rehydrate nodes
      similarities: nodes.map((n: any) => n.score),
      ids: nodes.map((n: any) => n.id_),
    };
  }

  async delete(refDocId: string): Promise<void> {
    await this.client.query("DELETE FROM embeddings WHERE id = $1", [refDocId]);
  }
}
