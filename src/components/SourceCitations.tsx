import { useState } from "react";
import type { RetrievedChunk } from "../rag";

interface Props {
  chunks: RetrievedChunk[];
}

export function SourceCitations({ chunks }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (chunks.length === 0) return null;

  // Deduplicate filenames for the summary line
  const filenames = [...new Set(chunks.map((c) => c.filename))];

  return (
    <div className="citations">
      <p className="citations__summary">
        <span className="citations__icon">◎</span>
        Retrieved {chunks.length} chunk{chunks.length !== 1 ? "s" : ""} from{" "}
        {filenames.join(", ")}
      </p>
      <ul className="citations__list">
        {chunks.map((chunk) => {
          const key = chunk.id;
          const isOpen = expanded === key;
          return (
            <li key={key} className="citation">
              <button
                className="citation__toggle"
                onClick={() => setExpanded(isOpen ? null : key)}
                aria-expanded={isOpen}
              >
                <span className="citation__file">{chunk.filename}</span>
                <span className="citation__score">
                  score {chunk.score.toFixed(2)}
                </span>
                <span className="citation__chevron">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <pre className="citation__excerpt">{chunk.content}</pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
