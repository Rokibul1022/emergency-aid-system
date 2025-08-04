import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

// Mock conversations and messages
const mockConversations = [
  {
    id: 1,
    title: 'Medical Emergency - Alice',
    participants: ['Alice', 'Volunteer'],
    lastMessage: 'I need medical assistance urgently',
    timestamp: Date.now() - 300000,
    unread: 2,
  },
  {
    id: 2,
    title: 'Food Request - Bob',
    participants: ['Bob', 'Volunteer'],
    lastMessage: 'Thank you for the help!',
    timestamp: Date.now() - 600000,
    unread: 0,
  },
];

const mockMessages = {
  1: [
    { id: 1, sender: 'Alice', text: 'Hello, I need medical assistance', timestamp: Date.now() - 300000, type: 'text' },
    { id: 2, sender: 'Volunteer', text: 'I can help. What\'s the situation?', timestamp: Date.now() - 280000, type: 'text' },
    { id: 3, sender: 'Alice', text: 'My friend is injured and bleeding', timestamp: Date.now() - 260000, type: 'text' },
    { id: 4, sender: 'Volunteer', text: 'I\'m on my way. Stay calm.', timestamp: Date.now() - 240000, type: 'text' },
    { id: 5, sender: 'Alice', text: 'I need medical assistance urgently', timestamp: Date.now() - 100000, type: 'text' },
  ],
  2: [
    { id: 1, sender: 'Bob', text: 'Hi, I need food supplies', timestamp: Date.now() - 600000, type: 'text' },
    { id: 2, sender: 'Volunteer', text: 'I have some supplies. Where are you?', timestamp: Date.now() - 580000, type: 'text' },
    { id: 3, sender: 'Bob', text: '456 Oak Ave', timestamp: Date.now() - 560000, type: 'text' },
    { id: 4, sender: 'Volunteer', text: 'I\'ll be there in 10 minutes', timestamp: Date.now() - 540000, type: 'text' },
    { id: 5, sender: 'Bob', text: 'Thank you for the help!', timestamp: Date.now() - 520000, type: 'text' },
  ],
};

const ChatPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages(mockMessages);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedConversation && Math.random() < 0.3) {
        const newMsg = {
          id: Date.now(),
          sender: selectedConversation.title.split(' - ')[1],
          text: 'New message received...',
          timestamp: Date.now(),
          type: 'text',
        };
        setMessages(prev => ({
          ...prev,
          [selectedConversation.id]: [...(prev[selectedConversation.id] || []), newMsg],
        }));
        addNotification('New message received', 'info');
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConversation, addNotification]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message = {
      id: Date.now(),
      sender: user?.name || 'Volunteer',
      text: newMessage,
      timestamp: Date.now(),
      type: 'text',
    };

    setMessages(prev => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), message],
    }));

    setNewMessage('');
    setIsTyping(false);

    // Simulate typing indicator
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const reply = {
          id: Date.now() + 1,
          sender: selectedConversation.title.split(' - ')[1],
          text: 'Thanks for your message. I\'ll respond shortly.',
          timestamp: Date.now(),
          type: 'text',
        };
        setMessages(prev => ({
          ...prev,
          [selectedConversation.id]: [...(prev[selectedConversation.id] || []), reply],
        }));
      }, 2000);
    }, 1000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;

    const message = {
      id: Date.now(),
      sender: user?.name || 'Volunteer',
      text: `File: ${file.name}`,
      timestamp: Date.now(),
      type: 'file',
      fileName: file.name,
      fileSize: file.size,
    };

    setMessages(prev => ({
      ...prev,
      [selectedConversation.id]: [...(prev[selectedConversation.id] || []), message],
    }));

    addNotification('File uploaded successfully', 'success');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container" style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 0' }}>
      <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32 }}>{t('chat.title') || 'Chat'}</h1>
      <div style={{ display: 'flex', gap: 32, maxWidth: 1200, margin: '0 auto', height: '70vh' }}>
        {/* Conversations List */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Conversations</h2>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              style={{
                padding: 12,
                borderBottom: '1px solid #ccc',
                cursor: 'pointer',
                backgroundColor: selectedConversation?.id === conv.id ? '#f0f0f0' : 'transparent',
                borderRadius: 4,
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#000' }}>{conv.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{conv.lastMessage}</div>
              <div style={{ fontSize: 10, color: '#999' }}>{formatTime(conv.timestamp)}</div>
              {conv.unread > 0 && (
                <div style={{ background: '#000', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 4 }}>
                  {conv.unread}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 2, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              <div style={{ borderBottom: '1px solid #ccc', paddingBottom: 12, marginBottom: 16 }}>
                <h2 style={{ color: '#000' }}>{selectedConversation.title}</h2>
                <div style={{ fontSize: 12, color: '#666' }}>Online</div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, padding: 8 }}>
                {messages[selectedConversation.id]?.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: 8,
                      textAlign: msg.sender === (user?.name || 'Volunteer') ? 'right' : 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        background: msg.sender === (user?.name || 'Volunteer') ? '#000' : '#f0f0f0',
                        color: msg.sender === (user?.name || 'Volunteer') ? '#fff' : '#000',
                        padding: '8px 12px',
                        borderRadius: 12,
                        maxWidth: '70%',
                        wordWrap: 'break-word',
                      }}
                    >
                      <div style={{ fontSize: 10, marginBottom: 4, opacity: 0.7 }}>{msg.sender}</div>
                      <div>{msg.text}</div>
                      {msg.type === 'file' && (
                        <div style={{ fontSize: 10, marginTop: 4 }}>
                          📎 {msg.fileName} ({(msg.fileSize / 1024).toFixed(1)} KB)
                        </div>
                      )}
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ textAlign: 'left', marginBottom: 8 }}>
                    <div style={{ display: 'inline-block', background: '#f0f0f0', padding: '8px 12px', borderRadius: 12 }}>
                      <div style={{ fontSize: 10, marginBottom: 4 }}>{selectedConversation.title.split(' - ')[1]}</div>
                      <div>Typing...</div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{ borderTop: '1px solid #ccc', paddingTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                  />
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label htmlFor="file-upload" style={{ background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 4, padding: '8px 12px', cursor: 'pointer' }}>
                    📎
                  </label>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    style={{ background: '#000', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontStyle: 'italic' }}>
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 