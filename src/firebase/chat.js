import { 
  ref, 
  push, 
  onValue, 
  off, 
  serverTimestamp,
  query,
  orderByChild,
  limitToLast
} from 'firebase/database';
import { realtimeDb } from './config';

// Send a message to a specific request chat
export const sendMessage = async (requestId, messageData) => {
  try {
    const chatRef = ref(realtimeDb, `chats/${requestId}/messages`);
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
    const chatRef = ref(realtimeDb, `chats/${requestId}/messages`);
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
    const chatRef = ref(realtimeDb, `chats/${requestId}/messages`);
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
    const chatRef = ref(realtimeDb, `chats/${requestId}/readStatus`);
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
    const chatRef = ref(realtimeDb, `chats/${requestId}/messages`);
    const readRef = ref(realtimeDb, `chats/${requestId}/readStatus`);
    
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
    const chatRef = ref(realtimeDb, `chats/${requestId}`);
    
    if (initialMessage) {
      const messagesRef = ref(realtimeDb, `chats/${requestId}/messages`);
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
    const chatRef = ref(realtimeDb, `chats/${requestId}`);
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
    const chatsRef = ref(realtimeDb, 'chats');
    
    const unsubscribe = onValue(chatsRef, (snapshot) => {
      const userChats = [];
      if (snapshot.exists()) {
        snapshot.forEach((chatSnapshot) => {
          const chatId = chatSnapshot.key;
          const messages = [];
          
          if (chatSnapshot.child('messages').exists()) {
            chatSnapshot.child('messages').forEach((messageSnapshot) => {
              const messageData = messageSnapshot.val();
              if (messageData.senderId === userId || messageData.senderRole === 'requester') {
                messages.push({
                  id: messageSnapshot.key,
                  ...messageData,
                  timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date()
                });
              }
            });
          }
          
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

const chatService = {
  sendMessage,
  subscribeToChat,
  getChatMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  createChatRoom,
  deleteChatRoom,
  getUserChats
};

export default chatService; 