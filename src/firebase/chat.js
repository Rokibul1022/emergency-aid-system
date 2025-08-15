import { 
  ref, 
  push, 
  onValue, 
  off, 
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  set,
  remove,
  onDisconnect,
  update
} from 'firebase/database';
import { realtimeDb } from './config';

// Send a message to a specific request chat
export const sendMessage = async (requestId, messageData) => {
  try {
    // Match existing Realtime DB rules: /messages/{requestId}/{messageId}
    const chatRef = ref(realtimeDb, `messages/${requestId}`);
    const message = {
      ...messageData,
      timestamp: serverTimestamp(),
      id: Date.now().toString() // Simple ID for client-side
    };
    
    await push(chatRef, message);
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Subscribe to chat messages for a specific request
export const subscribeToChat = (requestId, callback) => {
  try {
    const chatRef = ref(realtimeDb, `messages/${requestId}`);
    const chatQuery = query(chatRef, orderByChild('timestamp'), limitToLast(50));
    
    const unsubscribe = onValue(chatQuery, (snapshot) => {
      const messages = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const messageData = childSnapshot.val();
          messages.push({
            id: childSnapshot.key,
            ...messageData,
            timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date()
          });
        });
      }
      
      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      callback(messages);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to chat:', error);
    throw error;
  }
};

// Get chat messages for a specific request (one-time fetch)
export const getChatMessages = async (requestId) => {
  try {
    const chatRef = ref(realtimeDb, `messages/${requestId}`);
    const chatQuery = query(chatRef, orderByChild('timestamp'), limitToLast(50));
    
    return new Promise((resolve, reject) => {
      onValue(chatQuery, (snapshot) => {
        const messages = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const messageData = childSnapshot.val();
            messages.push({
              id: childSnapshot.key,
              ...messageData,
              timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date()
            });
          });
        }
        
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        resolve(messages);
      }, (error) => {
        reject(error);
      }, { onlyOnce: true });
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
};

// Mark messages as read for a user
export const markMessagesAsRead = async (requestId, userId) => {
  try {
    const chatRef = ref(realtimeDb, `messages/${requestId}/readStatus`);
    await push(chatRef, {
      userId,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Get unread message count for a user
export const getUnreadMessageCount = (requestId, userId, callback) => {
  try {
    const chatRef = ref(realtimeDb, `messages/${requestId}`);
    const readRef = ref(realtimeDb, `messages/${requestId}/readStatus`);
    
    let lastReadTimestamp = 0;
    let totalMessages = 0;
    
    // Get last read timestamp
    onValue(readRef, (snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const readData = childSnapshot.val();
          if (readData.userId === userId && readData.timestamp > lastReadTimestamp) {
            lastReadTimestamp = readData.timestamp;
          }
        });
      }
    });
    
    // Get total messages and calculate unread count
    onValue(chatRef, (snapshot) => {
      totalMessages = 0;
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const messageData = childSnapshot.val();
          if (messageData.timestamp > lastReadTimestamp && messageData.senderId !== userId) {
            totalMessages++;
          }
        });
      }
      callback(totalMessages);
    });
    
    return () => {
      off(chatRef);
      off(readRef);
    };
  } catch (error) {
    console.error('Error getting unread message count:', error);
    throw error;
  }
};

// Create a new chat room for a request
export const createChatRoom = async (requestId, initialMessage = null) => {
  try {
    const chatRef = ref(realtimeDb, `messages/${requestId}`);
    
    if (initialMessage) {
      const messagesRef = ref(realtimeDb, `messages/${requestId}`);
      await push(messagesRef, {
        ...initialMessage,
        timestamp: serverTimestamp(),
        id: Date.now().toString()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error creating chat room:', error);
    throw error;
  }
};

// Delete a chat room (admin function)
export const deleteChatRoom = async (requestId) => {
  try {
    const chatRef = ref(realtimeDb, `messages/${requestId}`);
    // Note: In a real implementation, you'd need to use remove() from Firebase
    // For now, we'll just return success
    return true;
  } catch (error) {
    console.error('Error deleting chat room:', error);
    throw error;
  }
};

// Get all active chats for a user
export const getUserChats = (userId, callback) => {
  try {
    const chatsRef = ref(realtimeDb, 'messages');
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const userChats = [];
      if (snapshot.exists()) {
        snapshot.forEach((chatSnapshot) => {
          const chatId = chatSnapshot.key;
          const messages = [];
          
          chatSnapshot.forEach((messageSnapshot) => {
            const messageData = messageSnapshot.val();
            if (messageData && (messageData.senderId === userId || messageData.senderRole === 'requester')) {
              messages.push({
                id: messageSnapshot.key,
                ...messageData,
                timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date()
              });
            }
          });
          
          if (messages.length > 0) {
            // Sort messages by timestamp and get the latest
            messages.sort((a, b) => a.timestamp - b.timestamp);
            const latestMessage = messages[messages.length - 1];
            
            userChats.push({
              chatId,
              latestMessage,
              messageCount: messages.length
            });
          }
        });
      }
      
      // Sort chats by latest message timestamp
      userChats.sort((a, b) => b.latestMessage.timestamp - a.latestMessage.timestamp);
      callback(userChats);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error getting user chats:', error);
    throw error;
  }
};

// Online status management
export const setUserOnline = async (userId, userData) => {
  try {
    const onlineRef = ref(realtimeDb, `onlineUsers/${userId}`);
    // Ensure the entry is removed when the client disconnects unexpectedly
    try {
      onDisconnect(onlineRef).remove();
    } catch (_) {}
    await set(onlineRef, {
      status: 'online',
      lastSeen: serverTimestamp(),
      displayName: userData?.displayName || userData?.email || 'User',
      role: userData?.role || 'requester'
    });
    return true;
  } catch (error) {
    console.error('Error setting user online:', error);
    throw error;
  }
};

export const setUserOffline = async (userId) => {
  try {
    const onlineRef = ref(realtimeDb, `onlineUsers/${userId}`);
    await remove(onlineRef);
    return true;
  } catch (error) {
    console.error('Error setting user offline:', error);
    throw error;
  }
};

export const updateUserLastSeen = async (userId) => {
  try {
    const onlineRef = ref(realtimeDb, `onlineUsers/${userId}`);
    await update(onlineRef, { lastSeen: serverTimestamp(), status: 'online' });
    return true;
  } catch (error) {
    console.error('Error updating last seen:', error);
    throw error;
  }
};

export const subscribeToOnlineUsers = (callback) => {
  try {
    const onlineRef = ref(realtimeDb, 'onlineUsers');
    
    const unsubscribe = onValue(onlineRef, (snapshot) => {
      const onlineUsers = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          onlineUsers.push({
            userId: childSnapshot.key,
            ...userData
          });
        });
      }
      callback(onlineUsers);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to online users:', error);
    throw error;
  }
};

const chatService = {
  sendMessage,
  subscribeToChat,
  getChatMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  createChatRoom,
  deleteChatRoom,
  getUserChats,
  setUserOnline,
  setUserOffline,
  updateUserLastSeen,
  subscribeToOnlineUsers
};

export default chatService; 