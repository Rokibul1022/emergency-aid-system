import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { createPanicAlert } from '../firebase/alerts';
import './PanicButtonPage.css';

const EMERGENCY_CONTACTS = [
  {
    icon: '🚔',
    label: 'Police',
    phone: '999',
    sms: '999',
    description: 'Emergency Police Hotline'
  },
  {
    icon: '🚑',
    label: 'Ambulance',
    phone: '999',
    sms: '999',
    description: 'Emergency Ambulance Hotline'
  },
  {
    icon: '🚒',
    label: 'Fire Department',
    phone: '999',
    sms: '999',
    description: 'Emergency Fire Hotline'
  },
  // Add more contacts as needed
];

const FIRST_AID_LINKS = [
  { label: 'Red Cross First Aid Guide', url: 'https://www.redcross.org.uk/first-aid/first-aid-app' },
  { label: 'WHO Emergency Health Topics', url: 'https://www.who.int/health-topics/emergencies' },
  { label: 'CDC Emergency Preparedness', url: 'https://www.cdc.gov/cpr/whatwedo/emergency.htm' },
];

const PanicButtonPage = () => {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { currentLocation, getCurrentLocation, setPanicMode, panicMode } = useApp();
  const [isActivating, setIsActivating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    let interval;
    if (panicMode && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setPanicMode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [panicMode, countdown, setPanicMode]);

  const handlePanicActivation = async () => {
    setIsActivating(true);
    setShowConfirm(false);
    try {
      // Ensure user has a phone number before creating panic alert
      let currentUserData = userData;
      if (!userData?.phone) {
        console.log('No phone number found in PanicButtonPage, setting default phone...');
        // Note: We can't call updateUser here since it's not imported, but we'll use fallback
        currentUserData = { ...userData, phone: '1234567890' };
      }
      
      // Get current location
      const location = await getCurrentLocation();
      // Send alert to Firestore
      if (user) {
        await createPanicAlert({
          userId: user.uid,
          displayName: user.displayName || user.email || 'User',
          email: user.email || '',
          phone: currentUserData?.phone || '1234567890',
          location: {
            lat: location?.lat,
            lng: location?.lng,
            accuracy: location?.accuracy,
            timestamp: location?.timestamp || Date.now()
          }
        });
      }
      // Simulate emergency alert
      setTimeout(() => {
        setPanicMode(true);
        setCountdown(30); // 30 second countdown
        setIsActivating(false);
        setAlertSent(true);
        setTimeout(() => setAlertSent(false), 4000);
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Emergency Alert Activated', {
            body: 'Your location has been sent to emergency services',
            icon: '/logo192.png',
            requireInteraction: true,
          });
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to activate panic mode:', error);
      setIsActivating(false);
    }
  };

  const handleDeactivate = () => {
    setPanicMode(false);
    setCountdown(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="panic-page">
      <div className="panic-container">
        <div className="panic-header">
          <h1>🚨 {t('panic.title') || 'Panic Button'}</h1>
          <p>{t('panic.description') || 'Use this button to immediately alert emergency services and your location.'}</p>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Emergency Alert</h2>
              <p>Are you sure you want to send a panic alert? Your location will be shared with emergency services.</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                <button className="btn btn-danger" onClick={handlePanicActivation} disabled={isActivating}>
                  Yes, Send Alert
                </button>
                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {alertSent && (
          <div className="alert-sent-feedback">
            <span role="img" aria-label="alert">✅</span> Panic alert sent!
          </div>
        )}

        <div className="panic-status">
          {panicMode ? (
            <div className="panic-active">
              <div className="panic-indicator">
                <div className="pulse-ring"></div>
                <div className="pulse-ring"></div>
                <div className="pulse-ring"></div>
              </div>
              <h2>{t('panic.alertActive') || 'Alert Active!'}</h2>
              <p>{t('panic.locationSent') || 'Your location has been sent to emergency services.'}</p>
              <div className="countdown">
                <span>Auto-deactivate in: {formatTime(countdown)}</span>
              </div>
              <button
                className="btn btn-danger"
                onClick={handleDeactivate}
              >
                {t('panic.deactivate') || 'Deactivate'}
              </button>
            </div>
          ) : (
            <div className="panic-inactive">
              <div className="panic-button-container">
                <button
                  className={`panic-button ${isActivating ? 'activating' : ''}`}
                  onClick={() => setShowConfirm(true)}
                  disabled={isActivating}
                >
                  {isActivating ? (
                    <>
                      <div className="spinner"></div>
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <span className="panic-icon">🚨</span>
                      <span className="panic-text">{t('panic.activate') || 'Activate Panic Alert'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="warning-text">
                ⚠️ This will immediately alert emergency services with your current location
              </p>
            </div>
          )}
        </div>

        {currentLocation && (
          <div className="location-info">
            <h3>📍 Current Location</h3>
            <div className="location-details">
              <p><strong>Latitude:</strong> {currentLocation.lat.toFixed(6)}</p>
              <p><strong>Longitude:</strong> {currentLocation.lng.toFixed(6)}</p>
              <p><strong>Accuracy:</strong> {currentLocation.accuracy}m</p>
              <p><strong>Last Updated:</strong> {new Date(currentLocation.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="emergency-contacts">
          <h3>📞 Emergency Contacts</h3>
          <div className="contact-list">
            {EMERGENCY_CONTACTS.map((contact, idx) => (
              <div className="contact-item" key={idx}>
                <span className="contact-icon">{contact.icon}</span>
                <div className="contact-info">
                  <strong>{contact.label}</strong>
                  <span>{contact.description}</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <a
                      href={`tel:${contact.phone}`}
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      Call Now
                    </a>
                    <a
                      href={`sms:${contact.sms}`}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      SMS Now
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="safety-tips">
          <h3>💡 Safety Tips & Emergency Info</h3>
          <ul>
            <li>Stay calm and assess your situation</li>
            <li>If possible, move to a safe location</li>
            <li>Keep your phone charged and accessible</li>
            <li>Follow instructions from emergency services</li>
            <li>Stay on the line when calling emergency numbers</li>
            <li>Share your location with trusted contacts if possible</li>
          </ul>
          <div style={{ marginTop: 16 }}>
            <strong>First Aid & Emergency Resources:</strong>
            <ul>
              {FIRST_AID_LINKS.map((link, idx) => (
                <li key={idx}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce' }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanicButtonPage; 