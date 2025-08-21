import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { createRequest, REQUEST_CATEGORIES, URGENCY_LEVELS } from '../firebase/requests';
import notificationService from '../services/notificationService';


const categories = Object.entries(REQUEST_CATEGORIES).map(([key, value]) => ({
  value,
  label: key.charAt(0) + key.slice(1).toLowerCase()
}));


const urgencies = Object.entries(URGENCY_LEVELS).map(([key, value]) => ({
  value,
  label: key.charAt(0) + key.slice(1).toLowerCase()
}));


const initialForm = {
  category: '',
  urgency: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  location: '',
  lat: '',
  lng: '',
  image: null,
};


// Builder class for constructing request data
class RequestBuilder {
  constructor(requesterId) {
    this.requestData = {
      title: '',
      description: '',
      category: '',
      urgency: '',
      location: null,
      latitude: null,
      longitude: null,
      timestamp: new Date(),
      panic: false,
      contact: {
        name: '',
        phone: '',
        email: ''
      },
      requesterId,
      imageURL: null
    };
  }


  setCategory(category) {
    this.requestData.category = category;
    this.requestData.title = `${category} Emergency Request`;
    return this;
  }


  setUrgency(urgency) {
    this.requestData.urgency = urgency;
    return this;
  }


  setDescription(description) {
    this.requestData.description = description;
    return this;
  }


  setContact({ name, phone, email }) {
    this.requestData.contact = { name, phone, email };
    return this;
  }


  setLocation({ lat, lng, address }) {
    if (lat && lng) {
      this.requestData.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
      this.requestData.latitude = parseFloat(lat);
      this.requestData.longitude = parseFloat(lng);
    } else if (address) {
      this.requestData.location = { address };
    }
    return this;
  }


  setImage(image) {
    this.requestData.imageURL = image ? null : null; // Placeholder for future Firebase Storage integration
    return this;
  }


  setTimestamp(timestamp = new Date()) {
    this.requestData.timestamp = timestamp;
    return this;
  }


  setPanic(panic = false) {
    this.requestData.panic = panic;
    return this;
  }


  build() {
    if (!this.requestData.category) {
      throw new Error('Category is required');
    }
    if (!this.requestData.urgency) {
      throw new Error('Urgency is required');
    }
    if (!this.requestData.description) {
      throw new Error('Description is required');
    }
    if (!this.requestData.contact.name) {
      throw new Error('Contact name is required');
    }
    if (!this.requestData.contact.phone) {
      throw new Error('Contact phone is required');
    }
    if (!this.requestData.contact.email) {
      throw new Error('Contact email is required');
    }
    if (!this.requestData.location && (!this.requestData.latitude || !this.requestData.longitude)) {
      throw new Error('Location or coordinates are required');
    }
    return { ...this.requestData };
  }
}


const RequestFormPage = () => {
  const { t } = useTranslation();
  const { getCurrentLocation, addNotification, currentLocation } = useApp();
  const { user, userData, updateUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  React.useEffect(() => {
    if (userData) {
      setForm(prev => ({
        ...prev,
        contactName: userData.displayName || '',
        contactPhone: userData.phone || '',
        contactEmail: userData.email || '',
      }));
    }
  }, [userData]);


  React.useEffect(() => {
    if (
      (!form.location && !form.lat && !form.lng) &&
      (userData?.location || currentLocation)
    ) {
      const loc = userData?.location || currentLocation;
      if (loc && loc.lat && loc.lng) {
        setForm(prev => ({
          ...prev,
          location: loc.address ? loc.address : `Lat: ${loc.lat}, Lng: ${loc.lng}`,
          lat: loc.lat,
          lng: loc.lng,
        }));
      }
    }
  }, [userData?.location, currentLocation, form.location, form.lat, form.lng]);


  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };


  const handleGetLocation = async () => {
    setLocationStatus('Locating...');
    setIsLoading(true);
    try {
      const loc = await getCurrentLocation();
      setForm((prev) => ({
        ...prev,
        lat: loc.lat,
        lng: loc.lng,
        location: `Lat: ${loc.lat}, Lng: ${loc.lng}`,
      }));
      setLocationStatus('Location detected!');
    } catch (e) {
      setLocationStatus('Failed to detect location');
    }
    setIsLoading(false);
  };


  const validate = () => {
    const newErrors = {};
   
    if (!form.category) newErrors.category = 'Category required';
    if (!form.urgency) newErrors.urgency = 'Urgency required';
    if (!form.description) newErrors.description = 'Description required';
    if (!form.contactName) newErrors.contactName = 'Name required';
    if (!form.contactPhone) newErrors.contactPhone = 'Phone required';
    if (!form.contactEmail) newErrors.contactEmail = 'Email required';
    if (!form.location && (!form.lat || !form.lng)) newErrors.location = 'Location required';
   
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
   
    console.log('Submit attempt - User:', user?.uid);
    console.log('Submit attempt - UserData:', userData);
   
    if (!validate()) {
      console.log('Validation failed');
      return;
    }
   
    if (!user) {
      addNotification('Please log in to submit a request', 'error');
      return;
    }
   
    if (!userData?.role) {
      console.log('No role found, setting as requester');
      try {
        await updateUser({ role: 'requester' });
        addNotification('Role set as requester', 'info');
      } catch (error) {
        console.error('Error setting role:', error);
      }
    }
   
    setSubmitting(true);
    setIsLoading(true);
   
    try {
      const requestData = new RequestBuilder(user.uid)
        .setCategory(form.category)
        .setUrgency(form.urgency)
        .setDescription(form.description)
        .setContact({
          name: form.contactName,
          phone: form.contactPhone,
          email: form.contactEmail
        })
        .setLocation({
          lat: form.lat,
          lng: form.lng,
          address: form.location
        })
        .setImage(form.image)
        .setTimestamp()
        .setPanic()
        .build();


      console.log('Request data to submit:', requestData);


      const result = await createRequest(requestData);
     
      if (result.success) {
        addNotification('Request submitted successfully!', 'success');
       
        try {
          await notificationService.notifyRequestReceived(
            { id: result.id, ...requestData },
            userData
          );
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
        }
      } else {
        throw new Error(result.error || 'Failed to create request');
      }
     
      setForm({
        ...initialForm,
        contactName: userData?.displayName || '',
        contactPhone: userData?.phone || '',
        contactEmail: userData?.email || '',
      });
      setLocationStatus('');
      setErrors({});
     
    } catch (error) {
      console.error('Error submitting request:', error);
      addNotification(error.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };


  return (
    <div className="page-container" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 40,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          color: '#2d3748',
          textAlign: 'center',
          marginBottom: 30,
          fontSize: '2.5rem',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('request.title') || 'Submit Emergency Request'}
        </h1>
       
        <form className="request-form" onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: '600',
                color: '#4a5568'
              }}>
                Category *
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.category ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                  {errors.category}
                </span>
              )}
            </div>


            <div>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: '600',
                color: '#4a5568'
              }}>
                Urgency Level *
              </label>
              <select
                name="urgency"
                value={form.urgency}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.urgency ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
                required
              >
                <option value="">Select Urgency</option>
                {urgencies.map(urg => (
                  <option key={urg.value} value={urg.value}>
                    {urg.label}
                  </option>
                ))}
              </select>
              {errors.urgency && (
                <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                  {errors.urgency}
                </span>
              )}
            </div>
          </div>


          <div>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: '600',
              color: '#4a5568'
            }}>
              Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the emergency situation in detail..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: '16px',
                border: errors.description ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: 12,
                fontSize: '16px',
                resize: 'vertical',
                backgroundColor: '#fff',
                transition: 'all 0.3s ease'
              }}
              required
            />
            {errors.description && (
              <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                {errors.description}
              </span>
            )}
          </div>


          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: '600',
                color: '#4a5568'
              }}>
                Contact Name *
              </label>
              <input
                type="text"
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                placeholder="Your full name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.contactName ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
                required
              />
              {errors.contactName && (
                <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                  {errors.contactName}
                </span>
              )}
            </div>


            <div>
              <label style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: '600',
                color: '#4a5568'
              }}>
                Contact Phone *
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="Your phone number"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: errors.contactPhone ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
                required
              />
              {errors.contactPhone && (
                <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                  {errors.contactPhone}
                </span>
              )}
            </div>
          </div>


          <div>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: '600',
              color: '#4a5568'
            }}>
              Contact Email *
            </label>
            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              placeholder="Your email address"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: errors.contactEmail ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: 12,
                fontSize: '16px',
                backgroundColor: '#fff',
                transition: 'all 0.3s ease'
              }}
              required
            />
            {errors.contactEmail && (
              <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                {errors.contactEmail}
              </span>
            )}
          </div>


          <div>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: '600',
              color: '#4a5568'
            }}>
              Location *
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Enter location or use GPS"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: errors.location ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
                required
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLoading}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {isLoading ? 'Getting...' : '📍 GPS'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input
                type="number"
                name="lat"
                value={form.lat}
                onChange={handleChange}
                placeholder="Latitude (e.g. 23.8103)"
                step="any"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: errors.location ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
              />
              <input
                type="number"
                name="lng"
                value={form.lng}
                onChange={handleChange}
                placeholder="Longitude (e.g. 90.4125)"
                step="any"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: errors.location ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: '16px',
                  backgroundColor: '#fff',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
            <div style={{ color: '#888', fontSize: '13px', lineHeight: '20px', marginTop: 4 }}>
              <span>Tip: If GPS is unavailable, enter your coordinates manually. You can use Google Maps or OpenStreetMap to find your latitude/longitude.</span>
            </div>
            {locationStatus && (
              <span style={{
                color: locationStatus.includes('Failed') ? '#e53e3e' : '#38a169',
                fontSize: '14px',
                marginTop: 4,
                display: 'block'
              }}>
                {locationStatus}
              </span>
            )}
            {errors.location && (
              <span style={{ color: '#e53e3e', fontSize: '14px', marginTop: 4 }}>
                {errors.location}
              </span>
            )}
          </div>


          <div>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: '600',
              color: '#4a5568'
            }}>
              Upload Image (Optional)
            </label>
            <input
              type="file"
              name="image"
              onChange={handleChange}
              accept="image/*"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                fontSize: '16px',
                backgroundColor: '#fff',
                transition: 'all 0.3s ease'
              }}
            />
          </div>


          <button
            type="submit"
            disabled={submitting || isLoading}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: '18px',
              fontWeight: '700',
              cursor: submitting || isLoading ? 'not-allowed' : 'pointer',
              opacity: submitting || isLoading ? 0.7 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Emergency Request'}
          </button>
        </form>
      </div>
    </div>
  );
};


export default RequestFormPage;
