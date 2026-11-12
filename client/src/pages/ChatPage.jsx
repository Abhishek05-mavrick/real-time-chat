import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import MessageArea from '../components/MessageArea.jsx';
import NewRoomModal from '../components/NewRoomModal.jsx';

function ChatPage() {
  const { user, logout } = useAuth();
  const { activeRoomId } = useChat();
  const [showNewRoom, setShowNewRoom] = useState(false);

  return (
    <div className="chat-page">
      <Sidebar onNewRoom={() => setShowNewRoom(true)} />
      <div className="chat-main">
        <header className="chat-header">
          <div className="user-info">
            <span className="user-avatar">{user.username[0].toUpperCase()}</span>
            <span>{user.username}</span>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </header>
        {activeRoomId ? (
          <MessageArea roomId={activeRoomId} />
        ) : (
          <div className="no-room">
            <div className="no-room-content">
              <span className="no-room-icon">💬</span>
              <h2>Welcome, {user.username}!</h2>
              <p>Select a room from the sidebar or start a new conversation</p>
            </div>
          </div>
        )}
      </div>
      {showNewRoom && <NewRoomModal onClose={() => setShowNewRoom(false)} />}
    </div>
  );
}

export default ChatPage;
