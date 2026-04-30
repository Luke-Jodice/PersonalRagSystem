import type { Message } from "../types";
import { SourceCitations } from "./SourceCitations";

interface Props {
  message: Message;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`chat-message ${isUser ? "chat-message--user" : "chat-message--assistant"}`}>
      <div className="chat-message__avatar">
        {isUser ? (
          <div className="avatar avatar--user">U</div>
        ) : (
          <div className="avatar avatar--assistant">✦</div>
        )}
      </div>
      <div className="chat-message__body">
        <span className="chat-message__role">{isUser ? "You" : "Claude"}</span>
        <div className="chat-message__content">
          {/* Basic whitespace-preserving render. For a production harness you
              would parse Markdown here (e.g. with react-markdown + remark-gfm)
              so Claude's code blocks, bullet lists, and bold text all render
              correctly. */}
          {message.content.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Show which document chunks were retrieved for this response */}
        {message.sources && message.sources.length > 0 && (
          <SourceCitations chunks={message.sources} />
        )}
      </div>
    </div>
  );
}
