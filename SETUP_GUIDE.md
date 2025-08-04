# Emergency Aid System - New Features Setup Guide

This guide will help you set up the new notification, SMS, email, and map features for the Emergency Aid System.

## 🗺️ Live Map Feature

The live map feature is now integrated and ready to use. It displays all active emergency requests on an interactive map using Leaflet.js and OpenStreetMap.

### Features:
- Real-time display of active emergency requests
- Color-coded markers by request category
- Click markers to see request details
- Available in both Admin Panel and Volunteer Dashboard

### No additional setup required - it's already working!

---

## 📨 Email Notifications (EmailJS)

### Setup Steps:

1. **Sign up for EmailJS**:
   - Go to [https://www.emailjs.com/](https://www.emailjs.com/)
   - Create a free account
   - Verify your email

2. **Create an Email Service**:
   - In EmailJS dashboard, go to "Email Services"
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the setup instructions
   - Note down your Service ID

3. **Create an Email Template**:
   - Go to "Email Templates"
   - Click "Create New Template"
   - Use this template structure:
   ```html
   To: {{to_email}}
   Subject: {{subject}}
   Message: {{message}}
   ```
   - Note down your Template ID

4. **Get your Public Key**:
   - Go to "Account" → "API Keys"
   - Copy your Public Key

5. **Configure Environment Variables**:
   Create a `.env` file in your project root:
   ```env
   REACT_APP_EMAILJS_SERVICE_ID=your_service_id
   REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
   REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key
   ```

---

## 📱 SMS Notifications (TextLocal)

### Setup Steps:

1. **Sign up for TextLocal**:
   - Go to [https://www.textlocal.in/](https://www.textlocal.in/)
   - Create a free account
   - Verify your phone number

2. **Get API Key**:
   - After verification, go to "API" section
   - Generate an API key
   - Note down your Sender ID (usually "TXTLCL")

3. **Configure Environment Variables**:
   Add to your `.env` file:
   ```env
   REACT_APP_TEXTLOCAL_API_KEY=your_api_key
   REACT_APP_TEXTLOCAL_SENDER=TXTLCL
   ```

---

## 🔔 Push Notifications (Firebase Cloud Messaging)

### Setup Steps:

1. **Enable Firebase Cloud Messaging**:
   - Go to your Firebase Console
   - Select your project
   - Go to "Project Settings" → "Cloud Messaging"
   - Enable Cloud Messaging if not already enabled

2. **Generate VAPID Key**:
   - In Cloud Messaging settings, click "Generate Key Pair"
   - Copy the generated VAPID key

3. **Update Service Worker**:
   - Edit `public/firebase-messaging-sw.js`
   - Replace the Firebase config with your actual config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Configure Environment Variables**:
   Add to your `.env` file:
   ```env
   REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key
   ```

---

## 🔧 Integration Features

### What's Already Integrated:

1. **Request Creation Notifications**:
   - When a user submits an emergency request, they receive:
     - Email confirmation
     - SMS confirmation
     - Browser notification

2. **Volunteer Assignment Notifications**:
   - When a volunteer is assigned to a request, the requester receives:
     - Email with volunteer details
     - SMS with volunteer contact info
     - Browser notification

3. **Status Update Notifications**:
   - When request status changes, notifications are sent via:
     - Email
     - SMS
     - Browser notification

4. **Panic Alert Notifications**:
   - When panic alerts are created, admins receive:
     - High-priority email alerts
     - Browser notifications with sound

5. **Live Map Integration**:
   - Admin Panel: "Live Map" tab shows all active requests
   - Volunteer Dashboard: Map section shows nearby requests
   - Real-time updates as requests are created/resolved

---

## 🚀 Testing the Features

### Test Email Notifications:
1. Submit a new emergency request
2. Check your email for confirmation
3. Assign a volunteer to the request
4. Check for volunteer assignment email

### Test SMS Notifications:
1. Ensure you have a valid phone number in your profile
2. Submit a request and check for SMS
3. Update request status and check for SMS updates

### Test Push Notifications:
1. Allow browser notifications when prompted
2. Submit a request and check for browser notification
3. Test panic alert notifications

### Test Live Map:
1. Go to Admin Panel → "Live Map" tab
2. Submit a request with location
3. See the request appear on the map in real-time
4. Click markers to see request details

---

## 🔧 Troubleshooting

### Email Not Working:
- Check EmailJS service configuration
- Verify template variables match the code
- Check browser console for errors

### SMS Not Working:
- Verify TextLocal API key is correct
- Check phone number format (should include country code)
- Ensure you have SMS credits in TextLocal

### Push Notifications Not Working:
- Check if notifications are enabled in browser
- Verify VAPID key is correct
- Check service worker is properly registered
- Ensure Firebase config is correct

### Map Not Loading:
- Check internet connection (map tiles require internet)
- Verify Leaflet.js is properly loaded
- Check browser console for JavaScript errors

---

## 📋 Environment Variables Summary

Create a `.env` file with all these variables:

```env
# EmailJS Configuration
REACT_APP_EMAILJS_SERVICE_ID=your_service_id
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key

# TextLocal SMS Configuration
REACT_APP_TEXTLOCAL_API_KEY=your_api_key
REACT_APP_TEXTLOCAL_SENDER=TXTLCL

# Firebase Cloud Messaging
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key

# Existing Firebase Config (if not already set)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# Geocoding API (already configured)
REACT_APP_GEOCODE_API_KEY=68874225cd188561912213mou8a0749
```

---

## 🎉 Features Summary

✅ **Live Map**: Real-time display of emergency requests  
✅ **Email Notifications**: Automatic email alerts for all events  
✅ **SMS Notifications**: Text message alerts for critical updates  
✅ **Push Notifications**: Browser notifications for real-time alerts  
✅ **Panic Alert Integration**: High-priority notifications for emergencies  
✅ **Volunteer Assignment**: Notifications when volunteers are assigned  
✅ **Status Updates**: Notifications for request status changes  

All features are now integrated and ready to use! The system will automatically send appropriate notifications based on user actions and request status changes. 