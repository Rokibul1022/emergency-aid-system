import { requestNotificationPermission, sendNotificationToUser, notificationTemplates } from '../firebase/messaging';
import { sendEmail, emailTemplates, sendRequestConfirmationEmail, sendVolunteerAssignedEmail, sendStatusUpdateEmail, sendNewRequestEmail } from '../firebase/email';

// Notification Service - Central hub for all notification types
class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
  }

  // Initialize notification permissions and FCM
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request notification permission and get FCM token
      this.fcmToken = await requestNotificationPermission();
      
      if (this.fcmToken) {
        console.log('FCM Token obtained:', this.fcmToken);
        // Here you would typically send this token to your backend
        // to associate it with the current user
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Send notification when emergency request is received
  async notifyRequestReceived(requestData, userData) {
    try {
      const { id: requestId, category, description } = requestData;
      const { email, displayName, phone } = userData;

      // Email notification only (SMS and push disabled for now)
      if (email) {
        await sendRequestConfirmationEmail(email, displayName, requestId, category);
        console.log('Request received email notification sent successfully');
      } else {
        console.log('No email address found for user, skipping email notification');
      }
    } catch (error) {
      console.error('Error sending request received notifications:', error);
    }
  }

  // Send notification when volunteer is assigned
  async notifyVolunteerAssigned(requestData, userData, volunteerData) {
    try {
      const { id: requestId, category } = requestData;
      const { email, displayName, phone } = userData;
      const { displayName: volunteerName, phone: volunteerPhone } = volunteerData;

      // Email notification only (SMS and push disabled for now)
      if (email) {
        await sendVolunteerAssignedEmail(email, displayName, requestId, volunteerName, volunteerPhone);
        console.log('Volunteer assigned email notification sent successfully');
      } else {
        console.log('No email address found for user, skipping volunteer assignment notification');
      }
    } catch (error) {
      console.error('Error sending volunteer assigned notifications:', error);
    }
  }

  // Send notification when request status is updated
  async notifyStatusUpdate(requestData, userData, newStatus) {
    try {
      const { id: requestId, category } = requestData;
      const { email, displayName, phone } = userData;

      // Email notification only (SMS and push disabled for now)
      if (email) {
        await sendStatusUpdateEmail(email, displayName, requestId, newStatus);
        console.log('Status update email notification sent successfully');
      } else {
        console.log('No email address found for user, skipping status update notification');
      }
    } catch (error) {
      console.error('Error sending status update notifications:', error);
    }
  }

  // Send notification to volunteers about new nearby request
  async notifyVolunteersNewRequest(requestData, nearbyVolunteers) {
    try {
      const { id: requestId, category, description } = requestData;

      for (const volunteer of nearbyVolunteers) {
        const { email, displayName, distance } = volunteer;

        // Email notification only (SMS and push disabled for now)
        if (email) {
          await sendNewRequestEmail(email, displayName, distance, category, requestId);
        }
      }

      console.log(`New request email notifications sent to ${nearbyVolunteers.length} volunteers`);
    } catch (error) {
      console.error('Error sending new request notifications to volunteers:', error);
    }
  }

  // Send panic alert notification
  async notifyPanicAlert(panicData, adminUsers) {
    try {
      const { id: alertId, location, phone, requesterName } = panicData;

      for (const admin of adminUsers) {
        // Email notification only (push disabled for now)
        if (admin.email) {
          await sendEmail(admin.email, '🚨 PANIC ALERT - Immediate Action Required', `
            Emergency panic alert received!
            
            Alert Details:
            - Requester: ${requesterName || 'Unknown'}
            - Phone: ${phone || 'Not provided'}
            - Location: ${location?.address || 'Unknown'}
            - Time: ${new Date().toLocaleString()}
            
            Please respond immediately!
          `);
        }
      }

      console.log(`Panic alert email notifications sent to ${adminUsers.length} admins`);
    } catch (error) {
      console.error('Error sending panic alert notifications:', error);
    }
  }

  // Send test notification
  async sendTestNotification(userId, message = 'Test notification from Emergency Aid System') {
    try {
      await sendNotificationToUser(userId, {
        title: 'Test Notification',
        body: message,
        tag: 'test',
        data: { type: 'test' }
      });
      console.log('Test notification sent successfully');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  // Get notification permission status
  getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'not-supported';
    }
    return Notification.permission;
  }

  // Check if notifications are enabled
  isNotificationsEnabled() {
    return this.getPermissionStatus() === 'granted';
  }

  // Request notification permission manually
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.initialize();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService; 