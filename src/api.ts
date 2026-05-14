import type { Message } from "./types";
import type { RetrievedChunk } from "./rag";

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "llama3.2";

function buildSystemPrompt(context: RetrievedChunk[]): string {
  if (context.length === 0) {
    return "You are a helpful assistant.";
  }

  const contextBlock = context
    .map(
      (c, i) =>
        `<source index="${i + 1}" file="${c.filename}">\n${c.content}\n</source>`
    )
    .join("\n\n");

  return [
    "You are a helpful assistant with access to the following document excerpts.",
    "Answer the user's question using the provided sources.",
    "If the answer cannot be found in the sources, say so clearly rather than guessing.",
    "When you use information from a source, cite it as [Source N].",
    "",
    "<context>",
    contextBlock,
    "</context>",
  ].join("\n");
}

export async function sendMessage(
  messages: Message[],
  userContent: string,
  context: RetrievedChunk[],
  onDelta?: (chunk: string) => void
): Promise<string> {
  const ollamaMessages = [
    { role: "system", content: buildSystemPrompt(context) },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userContent },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: ollamaMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body from Ollama");

  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const line of decoder.decode(value).split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        const token = parsed.message?.content ?? "";
        if (token) {
          fullText += token;
          onDelta?.(token);
        }
      } catch {
        // skip malformed lines
      }
    }
  }

  return fullText;
}
