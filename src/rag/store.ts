import { chunkText } from "./chunker";
import { buildIndex, retrieve, type ChunkIndex } from "./retriever";
import type { DocumentChunk, IndexedDocument, RetrievedChunk } from "./types";

/**
 * In-memory RAG document store.
 *
 * Holds all chunks and a pre-built BM25 index. The index is rebuilt on every
 * add/remove operation — this is fine for dozens of documents but becomes
 * expensive at thousands. At that scale you would:
 *  - Persist chunks to IndexedDB (idb-keyval is a lightweight wrapper)
 *  - Keep the index in a Web Worker so rebuilds don't block the UI thread
 *  - Or ship a backend with a proper vector DB (e.g. pgvector, Qdrant, Chroma)
 */

class RagStore {
  private docs = new Map<string, IndexedDocument>();
  private chunks: DocumentChunk[] = [];
  private index: ChunkIndex[] = [];

  add(id: string, filename: string, size: number, text: string, source: "default" | "user" = "user"): IndexedDocument {
    // Remove any previous version of the same file (by id)
    this.remove(id);

    const newChunks = chunkText(text, id, filename);
    this.chunks.push(...newChunks);

    const doc: IndexedDocument = {
      id,
      filename,
      size,
      chunkCount: newChunks.length,
      addedAt: new Date(),
      source,
    };
    this.docs.set(id, doc);

    // Rebuild the BM25 index with the new chunks included
    this.index = buildIndex(this.chunks);

    return doc;
  }

  remove(id: string): void {
    if (!this.docs.has(id)) return;
    this.docs.delete(id);
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    this.index = buildIndex(this.chunks);
  }

  search(query: string, topK = 5): RetrievedChunk[] {
    return retrieve(query, this.index, topK);
  }

  getDocuments(): IndexedDocument[] {
    return Array.from(this.docs.values()).sort(
      (a, b) => b.addedAt.getTime() - a.addedAt.getTime()
    );
  }

  get totalChunks(): number {
    return this.chunks.length;
  }

  get isEmpty(): boolean {
    return this.docs.size === 0;
  }
}

// Singleton — the entire app shares one store instance.
export const ragStore = new RagStore();
