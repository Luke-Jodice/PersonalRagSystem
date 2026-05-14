import { chunkText } from "./chunker";
import { buildIndex, retrieve, type ChunkIndex } from "./retriever";
import type { DocumentChunk, IndexedDocument, RetrievedChunk } from "./types";
import { persistDocument, deletePersistedDocument, loadPersistedDocuments } from "./db";

class RagStore {
  private docs = new Map<string, IndexedDocument>();
  private chunks: DocumentChunk[] = [];
  private index: ChunkIndex[] = [];

  add(id: string, filename: string, size: number, text: string, source: "default" | "user" = "user"): IndexedDocument {
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
    this.index = buildIndex(this.chunks);

    if (source === "user") {
      void persistDocument(doc, newChunks);
    }

    return doc;
  }

  remove(id: string): void {
    if (!this.docs.has(id)) return;
    const source = this.docs.get(id)!.source;
    this.docs.delete(id);
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    this.index = buildIndex(this.chunks);

    if (source === "user") {
      void deletePersistedDocument(id);
    }
  }

  // Restore previously persisted user documents from IndexedDB without re-chunking.
  async rehydrate(): Promise<void> {
    const entries = await loadPersistedDocuments();
    for (const { doc, chunks } of entries) {
      this.docs.set(doc.id, doc);
      this.chunks.push(...chunks);
    }
    if (entries.length > 0) {
      this.index = buildIndex(this.chunks);
    }
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

export const ragStore = new RagStore();
