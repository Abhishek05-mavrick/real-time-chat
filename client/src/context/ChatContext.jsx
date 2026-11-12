import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { api } from '../api.js';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [activeRoomId, setActiveRoomId] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Connect SSE
  const connectSSE = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(`/api/chat/stream?token=${token}`);
    // Actually we need to send the token in a header, but EventSource doesn't support headers.
    // We'll use a query param workaround or cookie. Let's use the auth middleware differently.
    // Actually, for SSE with auth, we need a different approach. Let me use a token query param.

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    eventSourceRef.current = es;

    es.addEventListener('init', (e) => {
      const data = JSON.parse(e.data);
      setRooms(data.rooms);
      setOnlineUsers(data.onlineUsers);
      setUnreadCounts(data.unreadCounts);
    });

    es.addEventListener('message:new', (e) => {
      const msg = JSON.parse(e.data);
      // This will be handled by the Messages component via room state
      // We store new messages in a queue
      if (msg.roomId) {
        setRooms(prev => prev.map(r =>
          r.id === msg.roomId
            ? { ...r, unreadCount: r.id !== activeRoomId ? (r.unreadCount || 0) + 1 : r.unreadCount }
            : r
        ));
      }
    });

    es.addEventListener('room:created', (e) => {
      const room = JSON.parse(e.data);
      setRooms(prev => {
        if (prev.find(r => r.id === room.id)) return prev;
        return [...prev, { ...room, unreadCount: 0 }];
      });
    });

    es.addEventListener('typing', (e) => {
      const data = JSON.parse(e.data);
      setTypingUsers(prev => ({ ...prev, [data.roomId]: data }));
      // Auto-clear after 5 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          if (prev[data.roomId]?.userId === data.userId) {
            const next = { ...prev };
            delete next[data.roomId];
            return next;
          }
          return prev;
        });
      }, 5000);
    });

    es.addEventListener('message:reaction', (e) => {
      // Handled by message list component
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(connectSSE, 3000);
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (user && !authLoading) {
      connectSSE();
      // Load users list
      api.getUsers().then(setUsers).catch(console.error);
    }
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [user, authLoading, connectSSE]);

  // Mark room as read when active
  useEffect(() => {
    if (activeRoomId) {
      setRooms(prev => prev.map(r =>
        r.id === activeRoomId ? { ...r, unreadCount: 0 } : r
      ));
    }
  }, [activeRoomId]);

  const startDM = async (otherUserId) => {
    const room = await api.createDM(otherUserId);
    setRooms(prev => {
      if (prev.find(r => r.id === room.id)) return prev;
      return [...prev, { ...room, unreadCount: 0 }];
    });
    setActiveRoomId(room.id);
    return room;
  };

  const createGroupRoom = async (name, memberIds) => {
    const room = await api.createRoom({ name, memberIds });
    setRooms(prev => [...prev, { ...room, unreadCount: 0 }]);
    setActiveRoomId(room.id);
    return room;
  };

  const value = {
    rooms, setRooms,
    users,
    onlineUsers,
    unreadCounts,
    typingUsers,
    activeRoomId, setActiveRoomId,
    startDM,
    createGroupRoom,
    eventSourceRef,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
