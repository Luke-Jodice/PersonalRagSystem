import type { DocumentChunk } from "./types";

/**
 * Chunker — splits a document's text into overlapping windows.
 *
 * Current strategy: character-based sliding window with overlap so that
 * sentences near a boundary appear in both adjacent chunks, reducing the
 * chance a relevant sentence falls into a seam.
 *
 * TO IMPROVE:
 *  - Switch to token-aware splitting (e.g. tiktoken / gpt-tokenizer) so
 *    CHUNK_SIZE maps directly to the LLM's context budget rather than an
 *    approximation based on characters.
 *  - Respect semantic boundaries: split on paragraph breaks first, then
 *    fall back to sentence boundaries, then character count.
 *  - For Markdown: strip front-matter, keep headings attached to their
 *    first paragraph so the retriever has structural context.
 */

const CHUNK_SIZE = 1500;  // characters (≈ 375 tokens at 4 chars/token)
const CHUNK_OVERLAP = 200; // characters of overlap between adjacent chunks

export function chunkText(
  text: string,
  docId: string,
  filename: string
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const content = text.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        id: `${docId}-chunk-${index}`,
        docId,
        filename,
        content,
        chunkIndex: index,
      });
      index++;
    }

    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Read a File object's text content.
 *
 * Supported file types:
 *  - .txt, .md, .mdx, .csv, .json, .ts, .tsx, .js, .jsx, .py, .html, .xml
 *    — any plain-text format the browser can decode as UTF-8.
 *
 * TO ADD PDF SUPPORT:
 *  1. npm install pdfjs-dist
 *  2. Detect `file.type === "application/pdf"`
 *  3. Use `pdfjsLib.getDocument(arrayBuffer)` to extract text page-by-page.
 *  Example:
 *    import * as pdfjsLib from "pdfjs-dist";
 *    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
 *    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
 *    const pages = await Promise.all(
 *      Array.from({ length: pdf.numPages }, (_, i) =>
 *        pdf.getPage(i + 1).then(p => p.getTextContent())
 *      )
 *    );
 *    return pages.flatMap(p => p.items.map((it: any) => it.str)).join(" ");
 */
export async function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file, "utf-8");
  });
}
