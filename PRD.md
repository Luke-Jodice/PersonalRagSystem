# AI Harness — Product Requirements Document

**Owner:** Luke Jodice
**Last updated:** 2026-05-10
**Horizon:** 3 months (primary) · 6 months (secondary)

---

## Problem Statement

AI conversations accumulate fast. After months of using Claude, a massive knowledge base of past thinking, research, code, and decisions lives scattered across exported chat files — but finding anything specific requires remembering which conversation covered what, or manually grepping through raw text. The same problem applies to any other personal documents (notes, markdown files, code, etc.) that are part of a working knowledge base.

**The core friction:** valuable context that already exists, that you've already paid for in time and thinking, is effectively invisible at query time.

---

## Goal

Build a personal, local-first tool that makes it fast and easy to search, recall, and build on past AI interactions and personal documents — turning a sprawling archive into something more like a searchable second brain.

---

## Non-Goals

- Multi-user or team product (personal tool only, for now)
- Replacing Claude.ai or any upstream AI provider UI
- Becoming a general note-taking app or document editor

---

## Current State (MVP — Shipped)

| Feature | Status |
|---|---|
| Claude-style chat UI (dark theme, streaming-ready) | ✅ Done |
| Local file drag-and-drop indexing | ✅ Done |
| BM25 keyword retrieval | ✅ Done |
| Source citations with expandable chunk text | ✅ Done |
| Auto-import Claude chat history on startup | ✅ Done |
| Token-by-token streaming via `onDelta` | ✅ Done |
| Analysis scaffolding (keyword extraction, similarity, RRF, MMR, etc.) | 🚧 Stubbed |

---

## Roadmap

### Month 1 — Reliability & Richer Indexing

The MVP resets on every page refresh and only handles plain text. Month 1 turns this into something you'd actually use daily.

**Persist the index across sessions**
- Store chunks in `IndexedDB` on every `ragStore.add()`; rehydrate on startup.
- Documents should survive a page refresh without re-uploading.

**PDF support**
- Wire in `pdfjs-dist` in `chunker.ts` → `readFileText()`.
- Unlocks importing research papers, exported PDFs, etc.

**Implement the analysis.ts stubs**
- `extractKeywords` — surface what each document is "about" in the UI sidebar.
- `termFrequencyHistogram` — quick visual fingerprint per document.
- `chunkDensity` — filter out low-information chunks before they reach the LLM.
- `findNearDuplicates` — detect and suppress redundant chunks from the same document.

**Better document browser**
- Filter/search documents by filename in the sidebar.
- Show per-document stats (chunk count, top keywords).
- Ability to remove individual documents from the index.

---

### Month 2 — Better Retrieval

BM25 is keyword-based and misses synonyms, paraphrases, and conceptual matches. Month 2 upgrades retrieval quality significantly.

**Semantic / embedding search**
- Embed each chunk at index time using a fast embedding model (Voyage AI's `voyage-3-lite` or Claude's built-in if available).
- Embed the user query at search time; retrieve by cosine similarity.
- Store vectors in IndexedDB alongside chunk text.

**Hybrid retrieval + RRF**
- Run BM25 and embedding search in parallel.
- Merge results with Reciprocal Rank Fusion (`reciprocalRankFusion` — already scaffolded).
- RRF handles the incompatible score scales cleanly.

**Query expansion**
- Use `expandQuery` (already scaffolded) to generate semantic variants of the user's question.
- Retrieve across all variants and merge — good for conversational or ambiguous queries.

**MMR reranking**
- Apply `maximalMarginalRelevance` (already scaffolded) before context injection.
- Balances relevance with diversity so five nearly-identical chunks don't crowd out other sources.

---

### Month 3 — Knowledge Base UX

Once retrieval is reliable, focus on UX features that make the tool feel like an actual knowledge companion rather than a search box.

**Document similarity graph**
- Use `findSimilarDocuments` (already scaffolded) to surface related documents.
- Show "related documents" in the sidebar when a document is selected.

**Conversation threading**
- Support multi-turn conversations that carry forward retrieved context.
- "Follow up on that" should know which sources the previous answer drew from.

**Auto-sync from a directory**
- Watch a local folder (e.g., `~/claude-exports/`) for new Claude chat exports.
- Auto-index new files without any drag-and-drop needed.

**Tags and collections**
- Let documents be tagged or grouped (e.g., "work," "side projects," "research").
- Filter retrieval scope by tag — "only search my work notes."

---

### Months 4–6 — Synthesis & Power Features

These are bigger swings — worth exploring once the core search experience is solid.

**Cross-conversation synthesis**
- Ask questions like "summarize everything I've learned about TypeScript generics across all my conversations."
- Requires clustering + multi-document summarization.

**Topic timeline**
- Surface when topics were first and last discussed across conversation history.
- Useful for seeing how your thinking on a subject evolved over time.

**Knowledge export**
- Export a curated set of retrieved passages + the conversation as markdown or a PDF.
- Share a "knowledge packet" with someone else or import it into Obsidian, Notion, etc.

**Readability-aware chunking**
- Use `readabilityScore` to adapt chunk boundaries to sentence structure rather than fixed character windows.
- Reduces mid-sentence cuts that hurt retrieval quality.

---

## Technical Principles

- **Local-first** — no data leaves the machine except the API call to Claude. No accounts, no cloud sync.
- **Upgrade incrementally** — every layer (chunker, retriever, store) is independently swappable without touching the rest.
- **Fast by default** — BM25 stays as the cheap fallback; embeddings are additive, not a hard dependency.
- **Single-user simplicity** — no auth, no multi-tenancy. Don't design for hypothetical future requirements.
