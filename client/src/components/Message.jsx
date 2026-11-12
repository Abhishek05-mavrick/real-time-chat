import { useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function Message({ message, currentUserId, onReact }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { users, onlineUsers } = useChat();
  const isOwn = message.senderId === currentUserId;

  const senderUser = users.find(u => u.id === message.senderId);
  const senderName = senderUser?.username || message.sender?.username || 'Unknown';

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const reactions = message.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  return (
    <div className={`message ${isOwn ? 'own' : ''} ${message.failed ? 'failed' : ''} ${message.optimistic ? 'optimistic' : ''}`}>
      <div className="message-avatar">
        {senderName[0].toUpperCase()}
      </div>
      <div className="message-content">
        <div className="message-header-row">
          <span className="message-sender">{senderName}</span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {message.failed && <span className="failed-label">Failed to send</span>}
        </div>
        <div className="message-text">{message.text}</div>
        {reactionEntries.length > 0 && (
          <div className="reactions">
            {reactionEntries.map(([emoji, userIds]) => (
              <button
                key={emoji}
                className={`reaction-btn ${userIds.includes(currentUserId) ? 'active' : ''}`}
                onClick={() => onReact(message.id, emoji)}
                title={userIds.map(id => users.find(u => u.id === id)?.username || '?').join(', ')}
              >
                {emoji} {userIds.length}
              </button>
            ))}
          </div>
        )}
        <div className="message-actions">
          <button
            className="emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add reaction"
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  className="emoji-option"
                  onClick={() => { onReact(message.id, emoji); setShowEmojiPicker(false); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Message;
