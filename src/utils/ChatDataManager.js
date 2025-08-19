class ChatDataManager {
  constructor(userId, role, userData) {
    if (!userId) throw new Error('User ID is required');
    this.userId = userId;
    this.role = role || 'requester';
    this.userData = userData;
    this.unsubscribe = null;
  }

  // Template method for subscribing to data
  subscribeToData(onProcessedData) {
    this.initialize();

    this.unsubscribe = this.fetchData((rawData) => {
      const processed = this.processData(rawData);
      onProcessedData(processed);
    });

    return () => this.cleanup();
  }

  // Hook methods to be implemented by subclasses
  initialize() {
    // Optional: Initialize state or resources (override if needed)
  }

  fetchData(onRawData) {
    throw new Error('fetchData must be implemented by subclass');
  }

  processData(rawData) {
    throw new Error('processData must be implemented by subclass');
  }

  handleError(error) {
    // Default error handling
    console.error('Error in subscription:', error);
  }

  // Cleanup subscription
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

class RequestDataManager extends ChatDataManager {
  constructor(userId, role, userData, subscribeToRequests) {
    super(userId, role, userData);
    this.subscribeToRequests = subscribeToRequests;
  }

  fetchData(onRawData) {
    return this.subscribeToRequests((requests) => {
      onRawData(requests);
    });
  }

  processData(requests) {
    const filtered = requests.filter((req) => {
      if (this.role === 'admin') return true;
      if (this.role === 'volunteer') {
        return req.assignedVolunteer === this.userId || 
               (req.status === 'pending' || req.status === 'in-progress');
      }
      return req.requesterId === this.userId;
    });

    return filtered.map((req) => ({
      id: req.id,
      title: `${req.title || 'Request'} - ${req?.contact?.name || 'User'}`,
      lastMessage: req.description || '',
      timestamp: req.timestamp?.toDate ? req.timestamp.toDate().getTime() : Date.now(),
      unread: 0,
      raw: req,
      status: req.status,
      isAssigned: req.assignedVolunteer === this.userId,
    }));
  }
}

class MessageDataManager extends ChatDataManager {
  constructor(userId, role, userData, requestId, subscribeToChat) {
    super(userId, role, userData);
    this.requestId = requestId;
    this.subscribeToChat = subscribeToChat;
  }

  fetchData(onRawData) {
    return this.subscribeToChat(this.requestId, (msgs) => {
      onRawData(msgs);
    });
  }

  processData(msgs) {
    const formatted = msgs.map((m) => ({
      ...m,
      sender: m.senderName || m.senderId || 'User',
      timestamp: m.timestamp instanceof Date ? m.timestamp.getTime() : m.timestamp,
    }));
    return { requestId: this.requestId, messages: formatted };
  }
}

class OnlineUsersDataManager extends ChatDataManager {
  constructor(userId, role, userData, subscribeToOnlineUsers, setUserOnline) {
    super(userId, role, userData);
    this.subscribeToOnlineUsers = subscribeToOnlineUsers;
    this.setUserOnline = setUserOnline;
  }

  initialize() {
    // Set user online status
    this.setUserOnline(this.userId, this.userData).catch((error) => {
      console.error('Failed to set user online:', error);
    });
  }

  fetchData(onRawData) {
    return this.subscribeToOnlineUsers((users) => {
      onRawData(users);
    });
  }

  processData(data) {
    return data; // Return online users list
  }
}

export { ChatDataManager, RequestDataManager, MessageDataManager, OnlineUsersDataManager };