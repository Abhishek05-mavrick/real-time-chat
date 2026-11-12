import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';

function Sidebar({ onNewRoom }) {
  const { user } = useAuth();
  const { rooms, activeRoomId, setActiveRoomId, onlineUsers, startDM, users } = useChat();

  const groupRooms = rooms.filter(r => r.type === 'group');
  const dmRooms = rooms.filter(r => r.type === 'dm');

  const getDMName = (room) => {
    const name = room.name.replace('dm-', '').split('-').map(Number);
    const otherId = name.find(id => id !== user.id);
    const otherUser = users.find(u => u.id === otherId);
    return otherUser ? otherUser.username : 'Unknown';
  };

  const getDMStatus = (room) => {
    const name = room.name.replace('dm-', '').split('-').map(Number);
    const otherId = name.find(id => id !== user.id);
    return onlineUsers.includes(otherId) ? 'online' : 'offline';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>💬 Chat</h2>
        <button className="new-room-btn" onClick={onNewRoom} title="New Room">+</button>
      </div>

      <div className="sidebar-section">
        <h3>Channels</h3>
        <ul className="room-list">
          {groupRooms.map(room => (
            <li
              key={room.id}
              className={`room-item ${room.id === activeRoomId ? 'active' : ''}`}
              onClick={() => setActiveRoomId(room.id)}
            >
              <span className="room-icon">#</span>
              <span className="room-name">{room.name}</span>
              {room.unreadCount > 0 && (
                <span className="unread-badge">{room.unreadCount}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <h3>Direct Messages</h3>
        <ul className="room-list">
          {dmRooms.map(room => (
            <li
              key={room.id}
              className={`room-item ${room.id === activeRoomId ? 'active' : ''}`}
              onClick={() => setActiveRoomId(room.id)}
            >
              <span className={`dm-status ${getDMStatus(room)}`} />
              <span className="room-name">{getDMName(room)}</span>
              {room.unreadCount > 0 && (
                <span className="unread-badge">{room.unreadCount}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section online-section">
        <h3>Online — {onlineUsers.length}</h3>
        <ul className="user-list">
          {users.filter(u => onlineUsers.includes(u.id)).map(u => (
            <li key={u.id} className="user-item" onClick={() => u.id !== user.id && startDM(u.id)}>
              <span className="online-dot" />
              <span>{u.username}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
