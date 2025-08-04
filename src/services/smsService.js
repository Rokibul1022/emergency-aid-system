// SMS Service using TextLocal (free alternative to Twilio)
// Sign up at: https://www.textlocal.in/

const TEXTLOCAL_API_KEY = process.env.REACT_APP_TEXTLOCAL_API_KEY || 'YOUR_TEXTLOCAL_API_KEY';
const TEXTLOCAL_SENDER = process.env.REACT_APP_TEXTLOCAL_SENDER || 'TXTLCL';

// Send SMS using TextLocal API
export const sendSMS = async (phoneNumber, message) => {
  try {
    const response = await fetch('https://api.textlocal.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: TEXTLOCAL_API_KEY,
        numbers: phoneNumber,
        message: message,
        sender: TEXTLOCAL_SENDER
      })
    });

    const data = await response.json();
    
    if (data.status === 'success') {
      console.log('SMS sent successfully:', data);
      return { success: true, data };
    } else {
      console.error('SMS sending failed:', data);
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

// SMS templates
export const smsTemplates = {
  requestConfirmation: (requestId, status) => 
    `Your emergency request (ID: ${requestId}) has been ${status}. We will notify you when a volunteer is assigned. Stay safe!`,
  
  volunteerAssigned: (requestId, volunteerName, phone) =>
    `Volunteer ${volunteerName} (${phone}) has been assigned to your request (ID: ${requestId}). They will contact you shortly.`,
  
  newRequestNearby: (distance, requestType, requestId) =>
    `New ${requestType} emergency request available ${distance}km away (ID: ${requestId}). Please check the app to respond.`,
  
  statusUpdate: (requestId, status) =>
    `Your emergency request (ID: ${requestId}) status updated to: ${status}. Check the app for details.`
};

// Send SMS to user when request is created
export const sendRequestConfirmationSMS = async (phoneNumber, requestId) => {
  const message = smsTemplates.requestConfirmation(requestId, 'received');
  return await sendSMS(phoneNumber, message);
};

// Send SMS to user when volunteer is assigned
export const sendVolunteerAssignedSMS = async (phoneNumber, requestId, volunteerName, volunteerPhone) => {
  const message = smsTemplates.volunteerAssigned(requestId, volunteerName, volunteerPhone);
  return await sendSMS(phoneNumber, message);
};

// Send SMS to volunteers about new nearby request
export const sendNewRequestSMS = async (phoneNumber, distance, requestType, requestId) => {
  const message = smsTemplates.newRequestNearby(distance, requestType, requestId);
  return await sendSMS(phoneNumber, message);
};

// Send SMS for status updates
export const sendStatusUpdateSMS = async (phoneNumber, requestId, status) => {
  const message = smsTemplates.statusUpdate(requestId, status);
  return await sendSMS(phoneNumber, message);
}; 