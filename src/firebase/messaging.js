import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './config';

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

// VAPID key for web push notifications
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || 'BJnkJMYN7_JCsCG7mlJfW0c7ub4xff4lcbpjy7JCbIgsSXdrw6OBZ54eij3bLt14mqyg6vzrgfx9MUfZ_AtNs5o';

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// Handle foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });
};

// Send notification to specific user
export const sendNotificationToUser = async (userId, notification) => {
  try {
    // This would typically be done through Firebase Functions
    // For now, we'll use the browser's notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: notification.tag || 'emergency-aid',
        requireInteraction: notification.requireInteraction || false,
        data: notification.data || {}
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Notification templates
export const notificationTemplates = {
  requestReceived: (requestId) => ({
    title: 'Emergency Request Received',
    body: `Your emergency request has been received and is being processed. Request ID: ${requestId}`,
    tag: 'request-received',
    requireInteraction: false
  }),
  
  requestStatusUpdated: (requestId, status) => ({
    title: 'Request Status Updated',
    body: `Your emergency request (${requestId}) status has been updated to: ${status}`,
    tag: 'status-updated',
    requireInteraction: false
  }),
  
  volunteerAssigned: (requestId, volunteerName) => ({
    title: 'Volunteer Assigned',
    body: `${volunteerName} has been assigned to your emergency request (${requestId})`,
    tag: 'volunteer-assigned',
    requireInteraction: true
  }),
  
  newRequestNearby: (distance, requestType) => ({
    title: 'New Emergency Request Nearby',
    body: `A new ${requestType} request is available ${distance}km from your location`,
    tag: 'new-request',
    requireInteraction: true
  })
}; 