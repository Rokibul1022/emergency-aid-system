// Email Service using EmailJS (free alternative to Firebase Functions)
// Sign up at: https://www.emailjs.com/

const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'YOUR_EMAILJS_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY';

// Initialize EmailJS
const initEmailJS = () => {
  if (window.emailjs) {
    window.emailjs.init(EMAILJS_PUBLIC_KEY);
  } else {
    console.error('EmailJS not loaded. Add the script to public/index.html');
  }
};

// Send email using EmailJS
export const sendEmail = async (toEmail, subject, message, templateParams = {}) => {
  try {
    // Initialize EmailJS if not already done
    initEmailJS();
    
    const response = await window.emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: toEmail,
        subject: subject,
        message: message,
        ...templateParams
      }
    );
    
    console.log('Email sent successfully:', response);
    return { success: true, data: response };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
export const emailTemplates = {
  requestReceived: (requestId, userName, requestType) => ({
    subject: 'Emergency Request Received',
    message: `
      Dear ${userName},
      
      Your emergency request has been received and is being processed.
      
      Request Details:
      - Request ID: ${requestId}
      - Type: ${requestType}
      - Status: Received
      - Timestamp: ${new Date().toLocaleString()}
      
      We will notify you when a volunteer is assigned to your request.
      Please stay safe and keep your phone nearby.
      
      Best regards,
      Emergency Aid Team
    `
  }),
  
  volunteerAssigned: (requestId, userName, volunteerName, volunteerPhone) => ({
    subject: 'Volunteer Assigned to Your Request',
    message: `
      Dear ${userName},
      
      A volunteer has been assigned to your emergency request.
      
      Request Details:
      - Request ID: ${requestId}
      - Assigned Volunteer: ${volunteerName}
      - Volunteer Contact: ${volunteerPhone}
      - Assignment Time: ${new Date().toLocaleString()}
      
      The volunteer will contact you shortly. Please keep your phone nearby.
      
      Best regards,
      Emergency Aid Team
    `
  }),
  
  statusUpdate: (requestId, userName, status) => ({
    subject: 'Request Status Updated',
    message: `
      Dear ${userName},
      
      Your emergency request status has been updated.
      
      Request Details:
      - Request ID: ${requestId}
      - New Status: ${status}
      - Update Time: ${new Date().toLocaleString()}
      
      You can track your request status in the Emergency Aid app.
      
      Best regards,
      Emergency Aid Team
    `
  }),
  
  newRequestNearby: (volunteerName, distance, requestType, requestId) => ({
    subject: 'New Emergency Request Nearby',
    message: `
      Dear ${volunteerName},
      
      A new emergency request is available near your location.
      
      Request Details:
      - Request ID: ${requestId}
      - Type: ${requestType}
      - Distance: ${distance}km from your location
      - Posted: ${new Date().toLocaleString()}
      
      Please check the Emergency Aid app to respond to this request.
      
      Best regards,
      Emergency Aid Team
    `
  })
};

// Send email when request is received
export const sendRequestConfirmationEmail = async (userEmail, userName, requestId, requestType) => {
  const template = emailTemplates.requestReceived(requestId, userName, requestType);
  return await sendEmail(userEmail, template.subject, template.message);
};

// Send email when volunteer is assigned
export const sendVolunteerAssignedEmail = async (userEmail, userName, requestId, volunteerName, volunteerPhone) => {
  const template = emailTemplates.volunteerAssigned(requestId, userName, volunteerName, volunteerPhone);
  return await sendEmail(userEmail, template.subject, template.message);
};

// Send email for status updates
export const sendStatusUpdateEmail = async (userEmail, userName, requestId, status) => {
  const template = emailTemplates.statusUpdate(requestId, userName, status);
  return await sendEmail(userEmail, template.subject, template.message);
};

// Send email to volunteers about new nearby request
export const sendNewRequestEmail = async (volunteerEmail, volunteerName, distance, requestType, requestId) => {
  const template = emailTemplates.newRequestNearby(volunteerName, distance, requestType, requestId);
  return await sendEmail(volunteerEmail, template.subject, template.message);
}; 