import { Document, SimpleNodeParser } from "llamaindex";

interface Chunk {
  text: string;
  metadata: Record<string, any>;
}

/**
 * Function to chunk PDF documents using LlamaIndex
 * @param pdfFiles Array of PDF File objects
 * @returns Array of text chunks
 */
export async function chunkPDFDocuments(pdfFiles: File[]): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  
  // Process each PDF file
  for (const file of pdfFiles) {
    if (file.type !== "application/pdf") {
      console.warn(`File ${file.name} is not a PDF, skipping...`);
      continue;
    }
    
    try {
      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // For now, we'll simulate reading the PDF content as text
      // In a real implementation, you'd use a PDF parsing library like pdfjs
      const textContent = await extractTextFromPDF(arrayBuffer);
      
      // Create a LlamaIndex document from the text content
      const document = new Document({
        id_: file.name,
        text: textContent,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      });
      
      // Use SimpleNodeParser to chunk the document
      const parser = new SimpleNodeParser({
        chunkSize: 1024, // 1KB chunks
        chunkOverlap: 200, // 200 bytes overlap
      });
      
      const nodes = parser.getNodesFromDocuments([document]);
      
      // Convert nodes to chunks
      for (const node of nodes) {
        chunks.push({
          text: node.getText(),
          metadata: {
            ...node.metadata,
            id: node.id_,
          },
        });
      }
    } catch (error) {
      console.error(`Error processing PDF file ${file.name}:`, error);
    }
  }
  
  return chunks;
}

/**
 * Extract text from PDF using pdfjs-dist
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamically import pdfjs-dist to avoid bundling issues
    const pdfjsLib = await import("pdfjs-dist");
    
    // Create a new loading task from the array buffer
    const typedArray = new Uint8Array(arrayBuffer);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => (item as any).str).join(" ");
      fullText += pageText + " ";
    }
    
    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    // Fallback: return a string representation of the buffer
    return new TextDecoder().decode(arrayBuffer.slice(0, 1000)) + "...[truncated]";
  }
}

/**
 * Function to generate embeddings for text chunks using Transformers.js
 * @param chunks Array of text chunks
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(chunks: Chunk[]): Promise<number[][]> {
  // Dynamically import transformers to avoid bundling issues
  const { pipeline } = await import("@huggingface/transformers");
  
  // Create a sentence similarity pipeline with the all-MiniLM-L6-v2 model
  console.log("Loading embedding model...");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("Embedding model loaded successfully");
  
  const embeddings: number[][] = [];
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.text.substring(0, 50)}...`);
    
    try {
      // Generate embedding for the text
      const output = await extractor(chunk.text, {
        pooling: "mean",
        normalize: true,
      });
      
      // Properly convert tensor to array - output is a tensor object
      let embeddingArray: number[];
      if (output.dims.length === 1) {
        // Single dimension - flatten directly
        embeddingArray = Array.from(output.data);
      } else {
        // Multi-dimensional - take the first row if it's [1, N] shape
        const flatArray = Array.from(output.data);
        const dimensions = output.dims[output.dims.length - 1]; // Last dimension is embedding size
        embeddingArray = flatArray.slice(0, dimensions);
      }
      
      embeddings.push(embeddingArray);
      
      console.log(`Generated embedding with ${embeddingArray.length} dimensions for chunk ${i + 1}`);
    } catch (error) {
      console.error(`Error generating embedding for chunk ${i + 1}:`, error);
      // Push an empty array as fallback
      embeddings.push([]);
    }
  }
  
  // Dispose of the extractor to free memory
  extractor?.dispose();
  
  return embeddings;
}

/**
 * Main function to process PDF files: chunk and generate embeddings
 * @param pdfFiles Array of PDF File objects
 * @returns Object containing chunks and their embeddings
 */
export async function processPDFDocuments(pdfFiles: File[]) {
  console.log(`Processing ${pdfFiles.length} PDF file(s)...`);
  
  // Step 1: Chunk the PDF documents
  const chunks = await chunkPDFDocuments(pdfFiles);
  console.log(`Chunked documents into ${chunks.length} chunks`);
  
  // Step 2: Generate embeddings for the chunks
  const embeddings = await generateEmbeddings(chunks);
  console.log(`Generated ${embeddings.length} embeddings`);
  
  // Log embeddings to console
  console.log("Embeddings:", embeddings);
  
  return {
    chunks,
    embeddings,
  };
}