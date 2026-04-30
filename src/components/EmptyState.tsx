interface Props {
  hasDocuments: boolean;
}

export function EmptyState({ hasDocuments }: Props) {
  const suggestions = hasDocuments
    ? [
        "Summarise the key points",
        "What topics are covered?",
        "Find anything about…",
        "Compare the documents",
      ]
    : [
        "Upload a file to get started",
        "Add .txt, .md, .py, .json…",
        "Drop multiple files at once",
        "Ask questions about your docs",
      ];

  return (
    <div className="empty-state">
      <div className="empty-state__logo">✦</div>
      <h1 className="empty-state__heading">
        {hasDocuments ? "What would you like to know?" : "How can I help you today?"}
      </h1>
      {!hasDocuments && (
        <p className="empty-state__sub">
          Add documents in the sidebar to ground answers in your own files.
        </p>
      )}
      {/* Suggested prompts — make these clickable by wiring an `onSelect`
          prop back up to App.tsx to pre-fill the ChatInput. */}
      <div className="empty-state__suggestions">
        {suggestions.map((s) => (
          <button key={s} className="suggestion-chip" disabled>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
