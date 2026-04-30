import type { RetrievedChunk } from "./rag";

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  /** Chunks retrieved for this message (only populated on assistant turns). */
  sources?: RetrievedChunk[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}
