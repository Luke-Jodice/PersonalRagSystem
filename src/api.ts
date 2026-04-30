import type { Message } from "./types";
import type { RetrievedChunk } from "./rag";

/**
 * AI Harness — API Layer
 *
 * This module is the integration point for connecting to Claude or any other
 * LLM. Currently it returns a stubbed response so the UI can be developed
 * and tested independently of the AI backend.
 *
 * The `context` parameter carries the RAG-retrieved chunks. When a real LLM
 * is wired up, these chunks are injected into the system prompt so the model
 * can ground its answer in the documents you indexed.
 *
 * TO INTEGRATE WITH CLAUDE:
 *
 *   1. Install the Anthropic SDK:
 *        npm install @anthropic-ai/sdk
 *
 *   2. Set your API key in a .env file (never commit this):
 *        VITE_ANTHROPIC_API_KEY=sk-ant-...
 *
 *   3. Because browsers cannot safely hold API keys, you have two options:
 *
 *      OPTION A — Backend proxy (recommended for production):
 *        Create a small server (e.g. Express / Fastify) that holds the key and
 *        forwards requests. The browser calls your server; your server calls
 *        Anthropic. This keeps the key off the client entirely.
 *
 *      OPTION B — Direct from browser (fine for local dev / demos):
 *        Use `dangerouslyAllowBrowser: true` in the Anthropic client. Only do
 *        this when you fully control who can access the page.
 *
 *   4. Replace the `sendMessage` stub body below with the real SDK call shown
 *      in the commented-out implementation further down.
 */

// ---------------------------------------------------------------------------
// STUB — replace this entire function body to connect to real AI
// ---------------------------------------------------------------------------
export async function sendMessage(
  messages: Message[],
  userContent: string,
  context: RetrievedChunk[],
  onDelta?: (chunk: string) => void
): Promise<string> {
  // Simulate network latency so the loading state is visible during development.
  await new Promise((resolve) => setTimeout(resolve, 800));

  void messages;
  void onDelta;

  if (context.length > 0) {
    const srcList = [...new Set(context.map((c) => c.filename))].join(", ");
    return (
      `[Stub] Retrieved ${context.length} chunk(s) from: ${srcList}.\n\n` +
      `Your question was: "${userContent}"\n\n` +
      `Wire up the Anthropic SDK in src/api.ts to get a real grounded answer.`
    );
  }

  return (
    `[Stub] No documents indexed yet — add files via the sidebar.\n\n` +
    `Your question was: "${userContent}"\n\n` +
    `Wire up the Anthropic SDK in src/api.ts to get real answers.`
  );
}

/*
 * ---------------------------------------------------------------------------
 * REAL IMPLEMENTATION — streaming via Anthropic SDK + RAG context injection
 *
 * Uncomment and adapt this once you have a backend proxy or are comfortable
 * with dangerouslyAllowBrowser for local dev.
 * ---------------------------------------------------------------------------
 *
 * import Anthropic from "@anthropic-ai/sdk";
 *
 * const client = new Anthropic({
 *   apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
 *   dangerouslyAllowBrowser: true, // remove when using a backend proxy
 * });
 *
 * function buildSystemPrompt(context: RetrievedChunk[]): string {
 *   if (context.length === 0) {
 *     return "You are a helpful assistant.";
 *   }
 *
 *   // Format each retrieved chunk with its source filename so the model
 *   // can cite it in its response.
 *   const contextBlock = context
 *     .map(
 *       (c, i) =>
 *         `<source index="${i + 1}" file="${c.filename}">\n${c.content}\n</source>`
 *     )
 *     .join("\n\n");
 *
 *   return [
 *     "You are a helpful assistant with access to the following document excerpts.",
 *     "Answer the user's question using the provided sources.",
 *     "If the answer cannot be found in the sources, say so clearly rather than guessing.",
 *     "When you use information from a source, cite it as [Source N].",
 *     "",
 *     "<context>",
 *     contextBlock,
 *     "</context>",
 *   ].join("\n");
 * }
 *
 * export async function sendMessage(
 *   messages: Message[],
 *   userContent: string,
 *   context: RetrievedChunk[],
 *   onDelta?: (chunk: string) => void
 * ): Promise<string> {
 *   const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
 *     role: m.role,
 *     content: m.content,
 *   }));
 *   apiMessages.push({ role: "user", content: userContent });
 *
 *   const stream = client.messages.stream({
 *     model: "claude-opus-4-6",
 *     max_tokens: 8096,
 *     system: buildSystemPrompt(context),
 *     messages: apiMessages,
 *   });
 *
 *   let fullText = "";
 *   for await (const event of stream) {
 *     if (
 *       event.type === "content_block_delta" &&
 *       event.delta.type === "text_delta"
 *     ) {
 *       fullText += event.delta.text;
 *       onDelta?.(event.delta.text);
 *     }
 *   }
 *   return fullText;
 * }
 */
