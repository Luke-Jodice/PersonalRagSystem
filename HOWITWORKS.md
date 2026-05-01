# How It Works

A walkthrough of the AI harness — what each layer does, how data flows from a
user's question to a grounded answer, and where to extend things.

---

## Quick Start

```bash
npm install
npm run dev   # → http://localhost:5173
```

---

## Project Layout

```
src/
├── api.ts                  # LLM integration point (stubbed; see below)
├── types.ts                # Shared TypeScript types
├── App.tsx                 # Root component — state, RAG dispatch, routing
│
├── rag/                    # Retrieval-Augmented Generation pipeline
│   ├── types.ts            # DocumentChunk, IndexedDocument, RetrievedChunk
│   ├── chunker.ts          # Text → overlapping chunks + FileReader helper
│   ├── retriever.ts        # BM25 keyword scorer
│   ├── store.ts            # In-memory document store (singleton)
│   └── index.ts            # Public re-exports
│
└── components/
    ├── Sidebar.tsx          # Left nav shell
    ├── DocumentPanel.tsx    # File drop zone + indexed document list
    ├── ChatMessage.tsx      # Single message bubble (user or assistant)
    ├── SourceCitations.tsx  # Collapsible retrieved-chunk viewer
    ├── ChatInput.tsx        # Auto-growing textarea + send button
    ├── TypingIndicator.tsx  # Animated dots while waiting for a response
    └── EmptyState.tsx       # Splash screen shown before the first message
```

---

## Data Flow

Every time the user sends a message, the following happens in `App.tsx`:

```
User types a question
        │
        ▼
1. ragStore.search(query, topK=5)
        │   BM25 scores every chunk in the index against the query terms.
        │   Returns the top-5 chunks with their source filenames and scores.
        │
        ▼
2. sendMessage(conversationHistory, userQuery, retrievedChunks)
        │   The retrieved chunks are passed to the API layer, which injects
        │   them into the LLM's system prompt as a <context> block.
        │   (Currently stubbed — returns a placeholder string.)
        │
        ▼
3. Assistant Message { content, sources: RetrievedChunk[] }
        │   Stored in React state alongside the chunks that produced it.
        │
        ▼
4. ChatMessage renders the answer
        └── SourceCitations renders collapsible chunk excerpts beneath it
```

---

## The RAG Pipeline

### 1. Indexing — `src/rag/`

When the user drops files onto the **Documents** panel in the sidebar:

1. `DocumentPanel` reads each file with the browser's `FileReader` API
   (plain text — `.txt`, `.md`, `.py`, `.json`, etc.).
2. `chunker.ts → chunkText()` splits the raw text into overlapping windows:
   - **Chunk size:** ~1,500 characters (~375 tokens at 4 chars/token)
   - **Overlap:** 200 characters so sentences near a boundary appear in both
     adjacent chunks, reducing the chance a key sentence falls into a seam.
3. `store.ts → ragStore.add()` stores the chunks and rebuilds the BM25 index.

Re-uploading the same filename replaces the old version (keyed by filename).

### 2. Retrieval — `src/rag/retriever.ts`

`ragStore.search(query, topK)` runs **BM25** (Okapi BM25, Robertson & Sparck
Jones 1994) — a bag-of-words ranking function that combines:

- **Term frequency (TF):** how often each query term appears in a chunk,
  with diminishing returns so a term appearing 10× isn't 10× as useful as 1×.
- **Inverse document frequency (IDF):** terms that appear in few chunks score
  higher than common terms — "photosynthesis" beats "the".
- **Length normalisation:** chunks aren't penalised for being short.

Stop words ("the", "and", "is", …) are removed before scoring. The tuning
parameters `K1 = 1.5` and `B = 0.75` are BM25 standard defaults.

### 3. Context Injection — `src/api.ts`

The retrieved chunks are formatted as XML-tagged source blocks and placed in
the LLM's system prompt:

```
<source index="1" file="design-doc.md">
...chunk text...
</source>

<source index="2" file="notes.txt">
...chunk text...
</source>
```

The model is instructed to answer from those sources and cite them as
`[Source N]` when it uses content from a specific chunk.

### 4. Citations — `src/components/SourceCitations.tsx`

The `RetrievedChunk[]` array that was passed into `sendMessage` is stored on
the assistant `Message` object (`message.sources`). `ChatMessage` passes it to
`SourceCitations`, which renders a collapsible list beneath each response
showing the filename, BM25 score, and raw chunk text for every source used.

---

## Wiring Up Claude

The stub in `src/api.ts` returns a placeholder string. To connect to a real
LLM, uncomment the implementation block in that file and follow these steps:

### 1. Install the SDK

```bash
npm install @anthropic-ai/sdk
```

### 2. Add your API key

Create a `.env` file at the project root (never commit this):

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Choose a deployment model

| Option | When to use | How |
|--------|-------------|-----|
| **Backend proxy** | Production / shared app | Create an Express/Fastify server that holds the key and forwards requests. The browser calls your server; your server calls Anthropic. |
| **Direct browser** | Local dev / personal demo | Pass `dangerouslyAllowBrowser: true` to the Anthropic client. Never do this for a public-facing app. |

### 4. Enable streaming (optional but recommended)

The commented-out implementation in `api.ts` uses `client.messages.stream()`.
Once enabled, uncomment the `onDelta` callback in `App.tsx` to update the
assistant bubble token-by-token as the response arrives.

---

## Upgrading Retrieval Quality

BM25 is keyword-based — it matches exact terms. It will miss synonyms and
paraphrases ("car" vs "vehicle"). To upgrade to **semantic / embedding-based**
retrieval:

1. **At index time** — call an embedding model (e.g. `text-embedding-3-small`
   from OpenAI, or Voyage from Anthropic) to get a `float[]` for each chunk.
   Store it alongside the chunk text.

2. **At query time** — embed the user's question with the same model, compute
   **cosine similarity** against all stored vectors, and return the top-k by
   score.

3. **For large corpora** — replace the linear scan with an approximate
   nearest-neighbour index (HNSWlib-node or Faiss both have WASM builds that
   work in the browser).

The upgrade is entirely contained in `src/rag/retriever.ts`. The rest of the
pipeline (chunking, store, context injection, citations) stays the same.

---

## Tuning Knobs

| Where | What | Default | Effect |
|-------|------|---------|--------|
| `src/rag/chunker.ts` | `CHUNK_SIZE` | 1500 chars | Larger = more context per chunk but fewer chunks fit in the LLM window |
| `src/rag/chunker.ts` | `CHUNK_OVERLAP` | 200 chars | More overlap = fewer boundary misses, more storage |
| `src/rag/retriever.ts` | `K1` | 1.5 | Higher = raw term frequency matters more |
| `src/rag/retriever.ts` | `B` | 0.75 | Higher = stronger length normalisation |
| `src/App.tsx` | `TOP_K` | 5 | More chunks = richer context, more tokens consumed |

---

## Adding PDF Support

Install `pdfjs-dist`, then follow the guide in `src/rag/chunker.ts →
readFileText()`. The rest of the pipeline is unchanged — PDFs become chunks
like any other file.

---

## Persisting the Index

The current store lives in memory and is lost on page refresh. To persist:

- **Browser** — write chunks to `IndexedDB` on every `ragStore.add()` and
  rehydrate on startup. `idb-keyval` is a minimal wrapper.
- **Backend** — store chunks in a database and expose a search endpoint. Swap
  `ragStore.search()` in `App.tsx` for a `fetch()` call to your server.

## Update Token
The token is tied to one Claude account, so all action runs count against that account's usage limits — if you bump into Pro/Max rate limits, the action will throttle until they reset.
Tokens can be rotated: rerun claude setup-token and update the secret.
If you ever want to fall back to per-token API billing, swap the input back to anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}.