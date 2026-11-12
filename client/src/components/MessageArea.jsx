import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { api } from '../api.js';
import Message from './Message.jsx';

function MessageArea({ roomId }) {
  const { user } = useAuth();
  const { rooms, typingUsers, eventSourceRef } = useChat();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimerRef = useRef(null);

  const room = rooms.find(r => r.id === roomId);
  const typing = typingUsers[roomId];

  // Load messages
  const loadMessages = useCallback(async (before) => {
    setLoading(true);
    try {
      const msgs = await api.getMessages(roomId, 20, before);
      if (msgs.length < 20) setHasMore(false);
      if (before) {
        setMessages(prev => [...msgs, ...prev]);
      } else {
        setMessages(msgs);
        // Scroll to bottom on initial load
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    loadMessages(null);
  }, [roomId, loadMessages]);

  // Listen for new messages via SSE
  useEffect(() => {
    const es = eventSourceRef.current;
    if (!es) return;

    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.roomId === roomId) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    const reactionHandler = (e) => {
      const data = JSON.parse(e.data);
      setMessages(prev => prev.map(m =>
        m.id === data.messageId ? { ...m, reactions: data.reactions } : m
      ));
    };

    es.addEventListener('message:new', handler);
    es.addEventListener('message:reaction', reactionHandler);

    return () => {
      es.removeEventListener('message:new', handler);
      es.removeEventListener('message:reaction', reactionHandler);
    };
  }, [roomId, eventSourceRef]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages.length]);

  // Send typing indicator
  const handleTyping = () => {
    api.sendTyping(roomId).catch(() => {});
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      api.clearTyping(roomId).catch(() => {});
    }, 3000);
  };

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);
    api.clearTyping(roomId).catch(() => {});

    // Optimistic update
    const optimisticMsg = {
      id: Date.now(),
      roomId,
      senderId: user.id,
      text,
      timestamp: new Date().toISOString(),
      reactions: {},
      sender: { id: user.id, username: user.username },
      optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const msg = await api.sendMessage(roomId, text);
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? { ...msg, sender: { id: user.id, username: user.username } } : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id ? { ...m, failed: true } : m
      ));
    }
    setSending(false);
  };

  // Load more (scroll up)
  const handleLoadMore = () => {
    if (messages.length > 0 && hasMore) {
      loadMessages(messages[0].id);
    }
  };

  // React to message
  const handleReact = async (messageId, emoji) => {
    const msg = messages.find(m => m.id === messageId);
    const hasReacted = msg?.reactions?.[emoji]?.includes(user.id);
    const action = hasReacted ? 'remove' : 'add';
    try {
      await api.reactToMessage(roomId, messageId, emoji, action);
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  };

  const roomTitle = room ? (room.type === 'dm' ? room.name.replace('dm-', '').split('-').map(Number).find(id => id !== user.id) : `# ${room.name}`) : '';

  return (
    <div className="message-area">
      <div className="message-header">
        <h3>{roomTitle}</h3>
      </div>
      <div className="messages-container" ref={messagesContainerRef}>
        {hasMore && (
          <button className="load-more-btn" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load older messages'}
          </button>
        )}
        {messages.map(msg => (
          <Message
            key={msg.id}
            message={msg}
            currentUserId={user.id}
            onReact={handleReact}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {typing && typing.userId !== user.id && (
        <div className="typing-indicator">
          <span className="typing-dots"><span /><span /><span /></span>
          {typing.username} is typing...
        </div>
      )}
      <form className="message-input" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={`Message ${room?.type === 'dm' ? '' : '#'}${room?.name || ''}`}
          value={input}
          onChange={e => { setInput(e.target.value); handleTyping(); }}
          disabled={sending}
          maxLength={2000}
        />
        <button type="submit" disabled={!input.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  );
}

export default MessageArea;
