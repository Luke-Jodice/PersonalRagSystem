import { useRef, useState } from "react";
import { readFileText } from "../rag/chunker";
import { ragStore } from "../rag";
import type { IndexedDocument } from "../rag";

interface Props {
  documents: IndexedDocument[];
  onStoreChange: () => void;
}

// File types the plain FileReader path can handle.
// Add "application/pdf" here once you install and configure pdfjs-dist
// (see src/rag/chunker.ts for the integration guide).
const ACCEPTED = ".txt,.md,.mdx,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.xml";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPanel({ documents, onStoreChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function indexFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    setIndexing(true);
    setError(null);

    try {
      for (const file of arr) {
        // Generate a stable id from the filename so re-uploading the same
        // file replaces the old version rather than duplicating it.
        const id = `doc-${file.name.replace(/[^a-z0-9]/gi, "_")}`;
        const text = await readFileText(file);
        ragStore.add(id, file.name, file.size, text);
      }
      onStoreChange(); // tell the parent to re-read the store and re-render
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to index file.");
    } finally {
      setIndexing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      indexFiles(e.dataTransfer.files);
    }
  }

  function handleRemove(id: string) {
    ragStore.remove(id);
    onStoreChange();
  }

  return (
    <div className="doc-panel">
      <p className="doc-panel__label">Documents</p>

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragging ? "drop-zone--active" : ""} ${indexing ? "drop-zone--loading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !indexing && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        aria-label="Upload documents"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          hidden
          onChange={(e) => e.target.files && indexFiles(e.target.files)}
        />
        {indexing ? (
          <span className="drop-zone__text">Indexing…</span>
        ) : (
          <>
            <span className="drop-zone__icon">↑</span>
            <span className="drop-zone__text">
              Drop files or <u>browse</u>
            </span>
            <span className="drop-zone__hint">.txt .md .py .json …</span>
          </>
        )}
      </div>

      {error && <p className="doc-panel__error">{error}</p>}

      {/* Indexed document list */}
      {documents.length > 0 && (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.id} className="doc-list__item">
              <div className="doc-list__info">
                <span className="doc-list__name" title={doc.filename}>
                  {doc.filename}
                </span>
                <span className="doc-list__meta">
                  {doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""} · {formatBytes(doc.size)}
                </span>
              </div>
              <button
                className="doc-list__remove"
                onClick={() => handleRemove(doc.id)}
                aria-label={`Remove ${doc.filename}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
