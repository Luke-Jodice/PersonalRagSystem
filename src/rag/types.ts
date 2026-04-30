export interface DocumentChunk {
  id: string;
  docId: string;
  filename: string;
  content: string;
  chunkIndex: number;
}

export interface IndexedDocument {
  id: string;
  filename: string;
  size: number;
  chunkCount: number;
  addedAt: Date;
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
}
