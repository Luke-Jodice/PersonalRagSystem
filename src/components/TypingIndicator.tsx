export function TypingIndicator() {
  return (
    <div className="chat-message chat-message--assistant">
      <div className="chat-message__avatar">
        <div className="avatar avatar--assistant">✦</div>
      </div>
      <div className="chat-message__body">
        <span className="chat-message__role">Claude</span>
        <div className="typing-indicator">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
