import { messaging, requestNotificationPermission, onMessageListener } from './config';

// Request browser notification permission and get FCM token
export const getFcmToken = async () => {
  return await requestNotificationPermission();
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  onMessageListener().then(callback);
};

// Placeholder: Send notification (should be done from server/cloud function)
// This is a placeholder for documentation; actual sending is done server-side
export const sendNotification = async (payload) => {
  // Use Firebase Admin SDK or Cloud Functions to send notifications
  // This function is a placeholder for frontend reference
  throw new Error('Sending notifications must be done from a secure server or Cloud Function.');
}; 