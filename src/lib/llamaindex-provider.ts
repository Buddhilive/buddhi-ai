import {
  Document,
  VectorStoreIndex,
  Settings,
  SentenceSplitter,
  BaseEmbedding,
  NodeWithScore,
  Metadata,
} from "llamaindex";

// Breaks raw text into manageable nodes (chunks) with overlap
const chunkText = async (rawText: string, chunkSize = 200, chunkOverlap = 20) => {
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
    console.log(`[Chunk ${idx}]: ${node.getContent().substring(0, 50)}...`);
  });

  return nodes;
}