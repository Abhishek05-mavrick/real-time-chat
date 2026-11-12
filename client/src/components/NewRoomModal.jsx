import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';

function NewRoomModal({ onClose }) {
  const { user } = useAuth();
  const { users, createGroupRoom, startDM } = useChat();
  const [tab, setTab] = useState('group');
  const [name, setName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');

  const otherUsers = users.filter(u => u.id !== user.id);

  const toggleUser = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }
    try {
      await createGroupRoom(name.trim(), selectedUsers);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartDM = async (userId) => {
    try {
      await startDM(userId);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Conversation</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-tabs">
          <button className={tab === 'group' ? 'active' : ''} onClick={() => setTab('group')}>
            New Channel
          </button>
          <button className={tab === 'dm' ? 'active' : ''} onClick={() => setTab('dm')}>
            Direct Message
          </button>
        </div>
        {error && <div className="error">{error}</div>}
        {tab === 'group' ? (
          <div className="modal-body">
            <input
              type="text"
              placeholder="Channel name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="modal-input"
            />
            <p className="label">Add members:</p>
            <ul className="user-select-list">
              {otherUsers.map(u => (
                <li key={u.id} onClick={() => toggleUser(u.id)} className={selectedUsers.includes(u.id) ? 'selected' : ''}>
                  <span className={`checkbox ${selectedUsers.includes(u.id) ? 'checked' : ''}`}>
                    {selectedUsers.includes(u.id) ? '✓' : ''}
                  </span>
                  {u.username}
                </li>
              ))}
            </ul>
            <button className="primary-btn" onClick={handleCreateGroup}>
              Create Channel
            </button>
          </div>
        ) : (
          <div className="modal-body">
            <p className="label">Select a user to message:</p>
            <ul className="user-select-list">
              {otherUsers.map(u => (
                <li key={u.id} onClick={() => handleStartDM(u.id)}>
                  {u.username}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewRoomModal;
