import type { DocumentChunk, RetrievedChunk } from "./types";

/**
 * Retriever — scores chunks against a query and returns the top-k matches.
 *
 * Current algorithm: BM25 (Robertson & Sparck Jones, 1994).
 * BM25 is a bag-of-words ranking function that rewards:
 *  - Term frequency in the chunk (tf), with diminishing returns
 *  - Inverse document frequency (idf) — rare terms score higher
 *  - Length normalisation — shorter chunks aren't unfairly penalised
 *
 * This is a solid baseline for keyword-based retrieval and requires no
 * external dependencies or API calls.
 *
 * TO UPGRADE TO SEMANTIC / EMBEDDING-BASED RETRIEVAL:
 *  1. At index time, call an embedding API (e.g. `text-embedding-3-small`
 *     from OpenAI, or Anthropic's own voyage-3-lite) to get a float[] for
 *     each chunk and store it alongside the chunk text.
 *  2. At query time, embed the user's query with the same model, then
 *     compute cosine similarity against all stored vectors and return the
 *     top-k by score.
 *  3. For larger corpora (thousands of chunks), swap the linear scan for an
 *     approximate nearest-neighbour index such as HNSWlib-node or Faiss
 *     (both have WASM builds that run in the browser).
 *
 * Example cosine similarity helper:
 *   function cosine(a: number[], b: number[]) {
 *     const dot = a.reduce((s, v, i) => s + v * b[i], 0);
 *     const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
 *     const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
 *     return dot / (na * nb);
 *   }
 */

// BM25 tuning parameters (standard defaults)
const K1 = 1.5;  // term-saturation — higher means raw tf matters more
const B  = 0.75; // length-normalisation strength (0 = off, 1 = full)

// Common English stop words filtered before scoring to reduce noise.
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","was","are","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","can","i","you",
  "he","she","it","we","they","this","that","these","those","what","which",
  "who","how","when","where","why","not","no","if","as","by","from","up",
  "about","into","through","during","before","after","above","below","between",
]);

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/** Pre-computed per-chunk data needed for BM25. */
export interface ChunkIndex {
  chunk: DocumentChunk;
  termFreq: Map<string, number>;
  tokenCount: number;
}

/**
 * Build a BM25 index from a flat list of chunks.
 * Call this once whenever the document store changes.
 */
export function buildIndex(chunks: DocumentChunk[]): ChunkIndex[] {
  return chunks.map((chunk) => {
    const tokens = tokenise(chunk.content);
    const termFreq = new Map<string, number>();
    for (const t of tokens) {
      termFreq.set(t, (termFreq.get(t) ?? 0) + 1);
    }
    return { chunk, termFreq, tokenCount: tokens.length };
  });
}

/**
 * Score all indexed chunks against `query` and return the top `topK`.
 */
export function retrieve(
  query: string,
  index: ChunkIndex[],
  topK = 5
): RetrievedChunk[] {
  if (index.length === 0) return [];

  const queryTerms = tokenise(query);
  if (queryTerms.length === 0) return [];

  // Average chunk length across the corpus (for BM25 length normalisation).
  const avgLen = index.reduce((s, ci) => s + ci.tokenCount, 0) / index.length;

  // Document frequency: how many chunks contain each query term.
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    const count = index.filter((ci) => ci.termFreq.has(term)).length;
    df.set(term, count);
  }

  const N = index.length;

  const scored = index.map((ci) => {
    let score = 0;
    for (const term of queryTerms) {
      const tf = ci.termFreq.get(term) ?? 0;
      if (tf === 0) continue;

      // IDF component: log((N - n + 0.5) / (n + 0.5) + 1)
      const n = df.get(term) ?? 0;
      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);

      // TF component with length normalisation
      const tfNorm =
        (tf * (K1 + 1)) /
        (tf + K1 * (1 - B + B * (ci.tokenCount / avgLen)));

      score += idf * tfNorm;
    }
    return { ...ci.chunk, score };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
