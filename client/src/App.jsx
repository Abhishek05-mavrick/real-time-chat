import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import ChatPage from './pages/ChatPage.jsx';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return <ChatPage />;
}

export default App;
