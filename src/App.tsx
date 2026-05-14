import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { TypingIndicator } from "./components/TypingIndicator";
import { EmptyState } from "./components/EmptyState";
import { sendMessage } from "./api";
import { ragStore } from "./rag";
import type { IndexedDocument } from "./rag";
import type { Message } from "./types";
import { claudeChats } from "virtual:claude-chats";
import "./App.css";

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror the document store into React state so the sidebar re-renders
  // when files are added or removed.
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const chatFeedRef = useRef<HTMLDivElement>(null);

  const refreshDocuments = useCallback(() => {
    setDocuments(ragStore.getDocuments());
  }, []);

  // Rehydrate persisted user docs from IndexedDB, then load default chat history.
  useEffect(() => {
    async function init() {
      await ragStore.rehydrate();
      for (const { filename, content, size } of claudeChats) {
        const id = `default-${filename.replace(/[^a-z0-9]/gi, "_")}`;
        ragStore.add(id, filename, size, content, "default");
      }
      refreshDocuments();
    }
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = chatFeedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const handleSend = useCallback(
    async (userContent: string) => {
      setError(null);

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: userContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const assistantId = generateId();

      /*
       * RAG step: retrieve the most relevant document chunks for the query.
       *
       * TOP_K controls how many chunks are injected into the context. More
       * chunks give the model more material to work with but consume more of
       * the context window and can slow responses. 5 is a reasonable default
       * for most use-cases; tune it based on your document sizes and model
       * context limits.
       *
       * TO SWAP IN SEMANTIC RETRIEVAL:
       *   Replace `ragStore.search(userContent)` with an embedding-based
       *   similarity search. See src/rag/retriever.ts for the upgrade guide.
       */
      const TOP_K = 5;
      const retrievedChunks = ragStore.search(userContent, TOP_K);

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date(), sources: retrievedChunks },
      ]);
      const onDelta = (chunk: string) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );

      try {
        await sendMessage(
          messages,
          userContent,
          retrievedChunks,
          onDelta
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  return (
    <div className="app">
      <Sidebar
        onNewChat={handleNewChat}
        documents={documents}
        onStoreChange={refreshDocuments}
      />

      <main className="chat-area">
        <div className="chat-feed" ref={chatFeedRef}>
          {messages.length === 0 && !isLoading ? (
            <EmptyState hasDocuments={documents.length > 0} />
          ) : (
            <>
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}

          {error && (
            <div className="error-banner" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
}
