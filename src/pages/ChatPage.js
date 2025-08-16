import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToRequests } from '../firebase/requests';
import { sendMessage, subscribeToChat, setUserOnline, setUserOffline, subscribeToOnlineUsers } from '../firebase/chat';

const ChatPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user, role, userData } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);

  // Build conversations list from requests depending on role
  useEffect(() => {
    const unsubscribe = subscribeToRequests((requests) => {
      const filtered = requests.filter((req) => {
        if (!user?.uid) return false;
        if (role === 'admin') return true;
        if (role === 'volunteer') {
          // Volunteers can see requests they're assigned to OR pending requests they can help with
          return req.assignedVolunteer === user.uid || 
                 (req.status === 'pending' || req.status === 'in-progress');
        }
        // requester
        return req.requesterId === user.uid;
      });

      const mapped = filtered.map((req) => ({
        id: req.id,
        title: `${req.title || 'Request'} - ${req?.contact?.name || 'User'}`,
        lastMessage: req.description || '',
        timestamp: req.timestamp?.toDate ? req.timestamp.toDate().getTime() : Date.now(),
        unread: 0,
        raw: req,
        status: req.status,
        isAssigned: req.assignedVolunteer === user?.uid,
      }));
      setConversations(mapped);
    });

    return () => unsubscribe && unsubscribe();
  }, [user?.uid, role]);

  // Handle online status
  useEffect(() => {
    if (!user?.uid || !userData) return;

    // Set user online when entering chat
    const setOnline = async () => {
      try {
        await setUserOnline(user.uid, userData);
      } catch (error) {
        console.error('Failed to set user online:', error);
      }
    };
    setOnline();

    // Subscribe to online users
    const unsubscribeOnline = subscribeToOnlineUsers(setOnlineUsers);

    // Update last seen periodically
    const interval = setInterval(async () => {
      try {
        await setUserOnline(user.uid, userData);
      } catch (error) {
        console.error('Failed to update last seen:', error);
      }
    }, 30000); // Update every 30 seconds

    // Cleanup on unmount
    return () => {
      unsubscribeOnline && unsubscribeOnline();
      clearInterval(interval);
      // Set user offline when leaving
      setUserOffline(user.uid).catch(console.error);
    };
  }, [user?.uid, userData]);

  // Subscribe to messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const requestId = selectedConversation.id;
    const unsubscribe = subscribeToChat(requestId, (msgs) => {
      setMessagesByConversation((prev) => ({
        ...prev,
        [requestId]: msgs.map((m) => ({
          ...m,
          // Normalize for UI
          sender: m.senderName || m.senderId || 'User',
          timestamp: m.timestamp instanceof Date ? m.timestamp.getTime() : m.timestamp,
        })),
      }));
      // Auto scroll
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    return () => unsubscribe && unsubscribe();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.uid) return;
    try {
      await sendMessage(selectedConversation.id, {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: userData?.displayName || user.email || 'User',
        senderRole: role || 'requester',
        type: 'text',
      });
      setNewMessage('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      console.error(err);
      addNotification('Failed to send message', 'error');
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const messages = selectedConversation ? (messagesByConversation[selectedConversation.id] || []) : [];

  return (
    <div className="page-container" style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 0' }}>
      <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32 }}>{t('chat.title') || 'Chat'}</h1>
      <div style={{ display: 'flex', gap: 32, maxWidth: 1200, margin: '0 auto', height: '70vh' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0',overflowY: 'auto', maxHeight: '100%' ,minHeight: 0}}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Conversations</h2>
          {conversations.length === 0 && (
            <div style={{ color: '#888' }}>No conversations yet.</div>
          )}
          {conversations.map((conv) => (
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
              {conv.lastMessage && <div style={{ fontSize: 12, color: '#666' }}>{conv.lastMessage}</div>}
              <div style={{ fontSize: 10, color: '#999' }}>{formatTime(conv.timestamp)}</div>
              {role === 'volunteer' && (
                <div style={{ fontSize: 10, color: conv.isAssigned ? '#28a745' : '#ffc107' }}>
                  {conv.isAssigned ? '✓ Assigned to you' : `Status: ${conv.status}`}
                </div>
              )}
              {conv.unread > 0 && (
                <div style={{ background: '#000', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 4 }}>
                  {conv.unread}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 2, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              <div style={{ borderBottom: '1px solid #ccc', paddingBottom: 12, marginBottom: 16 }}>
                <h2 style={{ color: '#000' }}>{selectedConversation.title}</h2>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {(() => {
                    const requesterId = selectedConversation.raw?.requesterId;
                    const assignedVolunteerId = selectedConversation.raw?.assignedVolunteer;

                    const requesterOnline = requesterId && onlineUsers.some(u => u.userId === requesterId);
                    const assignedVolunteerOnline = assignedVolunteerId && onlineUsers.some(u => u.userId === assignedVolunteerId);
                    const anyVolunteerOnline = onlineUsers.some(u => u.role === 'volunteer' && u.userId !== user?.uid);

                    let otherIsOnline = false;
                    if (role === 'volunteer') {
                      otherIsOnline = requesterOnline;
                    } else if (role === 'requester') {
                      otherIsOnline = assignedVolunteerOnline || anyVolunteerOnline;
                    } else {
                      // admin
                      otherIsOnline = requesterOnline || assignedVolunteerOnline || anyVolunteerOnline;
                    }

                    if (otherIsOnline) {
                      return (
                        <span style={{ color: '#28a745' }}>
                          ● Online
                        </span>
                      );
                    }
                    return (
                      <span style={{ color: '#6c757d' }}>
                        ○ Offline
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, padding: 8 }}>
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.uid || msg.sender === (userData?.displayName || user?.email);
                  return (
                    <div
                      key={msg.id}
                      style={{
                        marginBottom: 8,
                        textAlign: isOwn ? 'right' : 'left',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          background: isOwn ? '#000' : '#f0f0f0',
                          color: isOwn ? '#fff' : '#000',
                          padding: '8px 12px',
                          borderRadius: 12,
                          maxWidth: '70%',
                          wordWrap: 'break-word',
                        }}
                      >
                        <div style={{ fontSize: 10, marginBottom: 4, opacity: 0.7 }}>{msg.senderName || msg.sender}</div>
                        <div>{msg.text}</div>
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{formatTime(msg.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ borderTop: '1px solid #ccc', paddingTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                  />
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