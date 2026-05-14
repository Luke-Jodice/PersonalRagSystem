import type { DocumentChunk } from "./types";
import * as pdfjsLib from "pdfjs-dist";

// Resolve the worker via Vite's asset pipeline so it is served correctly in both
// dev and production builds.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

const CHUNK_SIZE = 1500;  // characters (≈ 375 tokens at 4 chars/token)
const CHUNK_OVERLAP = 200;

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

async function readPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then((p) => p.getTextContent())
    )
  );
  return pages
    .flatMap((p) => p.items.map((it) => ("str" in it ? it.str : "")))
    .join(" ");
}

export async function readFileText(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return readPdfText(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file, "utf-8");
  });
}
