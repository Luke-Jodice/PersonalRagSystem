import type { DocumentChunk, IndexedDocument } from "./types";

const DB_NAME = "harnessai-rag";
const DB_VERSION = 1;

// Cached connection — stays open for the page lifetime.
let _db: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!_db) {
    _db = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("documents")) {
          db.createObjectStore("documents", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks", { keyPath: "id" })
            .createIndex("byDoc", "docId");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { _db = null; reject(req.error); };
    });
  }
  return _db;
}

export async function persistDocument(doc: IndexedDocument, chunks: DocumentChunk[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["documents", "chunks"], "readwrite");
    tx.objectStore("documents").put(doc);
    const chunkStore = tx.objectStore("chunks");
    for (const chunk of chunks) chunkStore.put(chunk);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePersistedDocument(id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["documents", "chunks"], "readwrite");
    tx.objectStore("documents").delete(id);
    const chunkStore = tx.objectStore("chunks");
    const keysReq = chunkStore.index("byDoc").getAllKeys(id);
    keysReq.onsuccess = () => {
      for (const key of keysReq.result) chunkStore.delete(key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPersistedDocuments(): Promise<{ doc: IndexedDocument; chunks: DocumentChunk[] }[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["documents", "chunks"], "readonly");
    let docs: IndexedDocument[] = [];
    let allChunks: DocumentChunk[] = [];

    const docsReq = tx.objectStore("documents").getAll();
    docsReq.onsuccess = () => { docs = docsReq.result; };

    const chunksReq = tx.objectStore("chunks").getAll();
    chunksReq.onsuccess = () => { allChunks = chunksReq.result; };

    tx.oncomplete = () => {
      const chunksByDoc = new Map<string, DocumentChunk[]>();
      for (const chunk of allChunks) {
        const arr = chunksByDoc.get(chunk.docId) ?? [];
        arr.push(chunk);
        chunksByDoc.set(chunk.docId, arr);
      }
      resolve(
        docs.map((doc) => ({
          doc: { ...doc, addedAt: new Date(doc.addedAt) },
          chunks: (chunksByDoc.get(doc.id) ?? []).sort(
            (a, b) => a.chunkIndex - b.chunkIndex
          ),
        }))
      );
    };
    tx.onerror = () => reject(tx.error);
  });
}
