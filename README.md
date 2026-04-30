# AI Harness

A Claude-style chat UI with a local-file RAG (Retrieval-Augmented Generation)
pipeline, built with React + TypeScript + Vite.

Drop your own `.txt`, `.md`, `.py`, `.json`, or other plain-text files into
the sidebar and ask questions about them. The app retrieves the most relevant
passages with BM25 keyword search and (once you wire in an API key) passes
them to Claude as grounded context.

---

## Getting Started

```bash
npm install
npm run dev   # → http://localhost:5173
```

The app runs fully without an API key. The AI response is stubbed so you can
develop and test the UI and retrieval pipeline independently.

---

## Features

- **Claude-style chat UI** — dark theme, auto-growing input, streaming-ready
- **Local file indexing** — drag-and-drop or browse; supports any plain-text format
- **BM25 retrieval** — keyword-based chunk scoring with stop-word filtering
- **Source citations** — every assistant reply shows which chunks were retrieved,
  with scores and expandable raw text
- **Clean upgrade path** — swap BM25 for embeddings, or the stub for real Claude,
  by editing a single file each

---

## Connecting to Claude

1. `npm install @anthropic-ai/sdk`
2. Create `.env` at the project root: `VITE_ANTHROPIC_API_KEY=sk-ant-...`
3. Uncomment the real implementation in `src/api.ts`
4. Optionally enable token-by-token streaming via the `onDelta` callback in
   `src/App.tsx`

See [HOWITWORKS.md](./HOWITWORKS.md) for the full architecture walkthrough,
retrieval upgrade guide, and tuning reference.

---

## Project Structure

```
src/
├── api.ts              # LLM integration point (stubbed)
├── types.ts            # Shared types
├── App.tsx             # Root — state, RAG dispatch
├── rag/                # Chunker, BM25 retriever, in-memory store
└── components/         # UI components
```

Full details in [HOWITWORKS.md](./HOWITWORKS.md).
