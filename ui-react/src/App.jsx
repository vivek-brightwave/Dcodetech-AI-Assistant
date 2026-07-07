import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Settings, LogOut, Menu, X, UserCircle2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import LiquidEther from './components/LiquidEther';
import BorderGlow from './components/BorderGlow';
import DebugPipeline from './components/DebugPipeline';
import { useAuth } from './contexts/AuthContext';
import './App.css';

// Error boundary to prevent WebGL crashes from blanking the entire page
class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn('WebGL background failed:', error.message);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #090711 0%, #1a1025 50%, #090711 100%)' }} />;
    }
    return this.props.children;
  }
}

const LIQUID_ETHER_COLORS = ['#5227FF', '#FF9FFC', '#B497CF'];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const { user, token, guestSessionId, isGuest, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load chat history from server
  const fetchChatHistory = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers['Authorization'] && !headers['X-Guest-Session-ID']) return;
      const res = await fetch('/api/chats', { headers });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (e) {
      console.warn('Could not load chat history:', e);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setSidebarOpen(false);
  };

  const handleLoadChat = (chat) => {
    setMessages(chat.messages || []);
    setActiveChatId(chat.id);
    setSidebarOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    setIsStreaming(false);

    // Add an empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const chatIdParam = activeChatId ? `&chat_id=${activeChatId}` : '';
      const response = await fetch(`/chat?query=${encodeURIComponent(userMessage)}${chatIdParam}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });

        if (chunkValue) {
          setIsStreaming(true);
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            lastMsg.content += chunkValue;
            return newMessages;
          });
        }
      }

      // Refresh history sidebar after response
      setTimeout(fetchChatHistory, 500);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        lastMsg.content += '\n\n*Error: Could not connect to the server.*';
        return newMessages;
      });
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
    }
  };

  // Displayed user name
  const displayName = isGuest ? 'Guest User' : (user ? (user.first_name || user.email?.split('@')[0] || 'User') : 'User');
  const displayInitial = isGuest ? '👤' : displayName[0]?.toUpperCase();

  return (
    <div className="app-container">
      {/* Mobile/Overlay Backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-top-bar">
            <button className="close-sidebar-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
              <X size={20} />
            </button>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={16} />
            <span>New chat</span>
          </button>

        </div>

        <div className="sidebar-history">
          {chatHistory.length === 0 ? (
            <p className="history-label" style={{ opacity: 0.4, fontSize: '13px' }}>No chats yet</p>
          ) : (
            <>
              <p className="history-label">Recent Chats</p>
              {chatHistory.map(chat => (
                <div
                  key={chat.id}
                  className={`history-item ${activeChatId === chat.id ? 'active' : ''}`}
                  onClick={() => handleLoadChat(chat)}
                >
                  <span className="history-icon">💬</span>
                  <span className="history-text">{chat.title || 'Chat'}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            {isGuest ? (
              <UserCircle2 size={30} style={{ color: '#94a3b8', flexShrink: 0 }} />
            ) : (
              <div className="user-avatar">{displayInitial}</div>
            )}
            <span className="user-name">{displayName}</span>
          </div>
          {user?.role === 'ADMIN' && (
            <button className="new-chat-btn" onClick={() => navigate('/admin')} style={{ marginTop: '8px' }}>
              <Settings size={16} />
              <span>Admin Panel</span>
            </button>
          )}
          <button className="new-chat-btn" onClick={handleLogout} style={{ marginTop: '8px', color: '#f87171' }}>
            <LogOut size={16} />
            <span>{isGuest ? 'Exit Guest' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {!sidebarOpen && (
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Menu size={24} />
          </button>
        )}
        {/* Liquid Ether Background */}
        <div className="background-container">
          <WebGLErrorBoundary>
            <LiquidEther
              colors={LIQUID_ETHER_COLORS}
              mouseForce={20}
              cursorSize={100}
              resolution={0.5}
              autoDemo={true}
            />
          </WebGLErrorBoundary>
        </div>

        {/* Centered Content Wrapper */}
        <div className="chat-wrapper">
          {/* Top Header */}
          <header className="main-header">
            <h1>Dcodetech AI Assistant</h1>
            {isGuest && (
              <span style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(148,163,184,0.1)', padding: '2px 10px', borderRadius: '99px', border: '1px solid rgba(148,163,184,0.2)' }}>
                Guest Session
              </span>
            )}
          </header>

          {/* Chat Area */}
          <div className="chat-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="ai-avatar-large">D</div>
                <h2>How can I help you today?</h2>
                {isGuest && (
                  <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
                    You're in a guest session.{' '}
                    <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}>
                      Sign in
                    </button>{' '}
                    to save your history.
                  </p>
                )}
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`message-row ${msg.role}`}>
                    <div className={`message-bubble ${msg.role}`}>
                      {msg.role === 'assistant' ? (
                        <div
                          className="markdown-body"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content)) }}
                        />
                      ) : (
                        <div>{msg.content}</div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="input-area-container">
            <form className="chat-form" onSubmit={handleSubmit}>
              <BorderGlow
                className="chat-input-wrapper"
                edgeSensitivity={30}
                glowColor="180, 151, 207"
                backgroundColor="#120F17"
                borderRadius={28}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message Dcodetech AI..."
                  rows="1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="send-button"
                  disabled={!input.trim() || isTyping}
                >
                  <Send size={18} />
                </button>
              </BorderGlow>
            </form>
            <div className="disclaimer">
              Dcodetech AI can make mistakes. Consider verifying important information.
            </div>
          </div>
        </div>
      </main>

      <DebugPipeline
        isOpen={debugOpen}
        onClose={() => setDebugOpen(false)}
      />
    </div>
  );
}

export default App;
