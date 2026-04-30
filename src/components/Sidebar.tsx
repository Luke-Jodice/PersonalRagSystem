import { DocumentPanel } from "./DocumentPanel";
import type { IndexedDocument } from "../rag";

interface Props {
  onNewChat: () => void;
  documents: IndexedDocument[];
  onStoreChange: () => void;
}

export function Sidebar({ onNewChat, documents, onStoreChange }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__logo">Claude</span>
        <button className="sidebar__new-chat" onClick={onNewChat} aria-label="New chat">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
        </button>
      </div>

      {/* RAG document manager */}
      <DocumentPanel documents={documents} onStoreChange={onStoreChange} />

      <div className="sidebar__divider" />

      <nav className="sidebar__nav">
        {/* Conversation history — in a real harness persist conversations to
            localStorage or a backend and render each as a clickable item. */}
        <p className="sidebar__empty">No previous chats</p>
      </nav>

      <div className="sidebar__footer">
        {/* User profile — a real harness would show the authenticated user's
            name and avatar here with a link to settings / API usage. */}
        <div className="sidebar__user">
          <div className="avatar avatar--user avatar--sm">U</div>
          <span>User</span>
        </div>
      </div>
    </aside>
  );
}
