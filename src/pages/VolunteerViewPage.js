import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  assignVolunteerToRequest, 
  updateRequestStatus,
  subscribeToRequests,
  REQUEST_CATEGORIES,
  URGENCY_LEVELS 
} from '../firebase/requests';
import { sendMessage, subscribeToChat } from '../firebase/chat';
import { createDonation } from '../firebase/donations';
import RequestLocationMap from '../components/common/RequestLocationMap';
import { subscribeToActivePanicAlerts } from '../firebase/alerts';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import RequestsMap from '../components/RequestsMap';

const VolunteerViewPage = () => {
  const { t } = useTranslation();
  const { addNotification, getCurrentLocation, setManualLocation } = useApp();
  const { user, userData } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  
  // Chat functionality
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Donation functionality
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationForm, setDonationForm] = useState({
    title: '',
    category: 'general',
    description: '',
    amount: '',
    type: 'monetary' // monetary, goods, services
  });

  const [panicAlerts, setPanicAlerts] = useState([]);
  const [showManualLocationPrompt, setShowManualLocationPrompt] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Get user location for distance calculation - only on mount, not repeatedly
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        // Don't show modal automatically - only when user clicks "Update Location"
        console.log('Location not available on mount:', error.message);
      }
    };
    getUserLocation();
  }, []); // Remove getCurrentLocation dependency to prevent repeated calls

  // Manual location entry fallback
  const handleManualLocationSave = async () => {
    setIsGeocoding(true);
    let ok = false;
    if (manualAddress && (!manualLat || !manualLng)) {
      ok = await setManualLocation('', '', manualAddress);
    } else {
      ok = await setManualLocation(manualLat, manualLng, manualAddress);
    }
    setIsGeocoding(false);
    if (ok) {
      setManualAddress('');
      setShowManualLocationPrompt(false);
      setManualLat('');
      setManualLng('');
      addNotification('Location set successfully!', 'success');
    }
  };

  // Handle manual location update button click
  const handleLocationUpdate = async () => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      addNotification('Location updated successfully!', 'success');
    } catch (error) {
      setShowManualLocationPrompt(true);
    }
  };

  // Handle panic alert actions
  const handlePanicAlertAction = async (alertId, action, alert) => {
    try {
      if (action === 'respond') {
        // Mark panic alert as responded to
        await updateDoc(doc(db, 'panic_alerts', alertId), {
          respondedBy: user.uid,
          respondedAt: serverTimestamp(),
          status: 'responded'
        });
        addNotification('Panic alert marked as responded! Now you can call or message the requester.', 'success');
      } else if (action === 'resolve') {
        // Mark panic alert as resolved
        await updateDoc(doc(db, 'panic_alerts', alertId), {
          resolvedBy: user.uid,
          resolvedAt: serverTimestamp(),
          resolved: true,
          status: 'resolved'
        });
        addNotification('Panic alert marked as resolved!', 'success');
      } else if (action === 'call') {
        // Call the panic alert requester
        if (alert.phone) {
          window.open(`tel:${alert.phone}`, '_self');
          addNotification('Initiating call to requester...', 'info');
        } else {
          addNotification('No phone number available for this requester', 'warning');
        }
      } else if (action === 'message') {
        // Send SMS to the panic alert requester
        if (alert.phone) {
          const message = `Emergency Response: We have received your panic alert. Help is on the way. Please stay safe and call 999 if immediate danger.`;
          window.open(`sms:${alert.phone}?body=${encodeURIComponent(message)}`, '_self');
          addNotification('Opening SMS to requester...', 'info');
        } else {
          addNotification('No phone number available for this requester', 'warning');
        }
      }
    } catch (error) {
      console.error('Error updating panic alert:', error);
      addNotification('Failed to update panic alert', 'error');
    }
  };

  // Subscribe to active panic alerts
  useEffect(() => {
    const unsubscribe = subscribeToActivePanicAlerts((alerts) => {
      console.log('Received panic alerts:', alerts);
      
      // Ensure all alerts have phone numbers
      const alertsWithPhone = alerts.map(alert => {
        if (!alert.phone) {
          console.log('Found alert without phone, adding default phone:', alert.id);
          // Update the alert in Firestore to add phone number
          updateDoc(doc(db, 'panic_alerts', alert.id), {
            phone: '1234567890'
          }).catch(error => {
            console.error('Error updating alert phone:', error);
          });
          return { ...alert, phone: '1234567890' };
        }
        return alert;
      });
      
      alertsWithPhone.forEach(alert => {
        console.log('Alert phone number:', alert.phone, 'Alert ID:', alert.id);
      });
      
      setPanicAlerts(alertsWithPhone);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time requests
  useEffect(() => {
    if (!user || !user.uid || !userData) return;
    const unsubscribe = subscribeToRequests((requestsData) => {
      // Calculate distances if user location is available
      const requestsWithDistance = requestsData.map(request => {
        if (userLocation && request.location) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            request.location.lat,
            request.location.lng
          );
          return { ...request, distance: distance.toFixed(1) };
        }
        return { ...request, distance: null };
      });
      setRequests(requestsWithDistance);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, userData, userLocation]);

  // Subscribe to chat when a request is selected
  useEffect(() => {
    if (!selected || !user) return;

    const unsubscribe = subscribeToChat(selected.id, (messages) => {
      setChatMessages(messages);
    });

    return () => unsubscribe();
  }, [selected, user]);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleAccept = async (requestId) => {
    try {
      await assignVolunteerToRequest(requestId, user.uid);
      addNotification('Request accepted successfully!', 'success');
    } catch (error) {
      console.error('Error accepting request:', error);
      addNotification('Failed to accept request', 'error');
    }
  };

  const handleDecline = async (requestId) => {
    try {
      await updateRequestStatus(requestId, 'cancelled');
      addNotification('Request declined.', 'info');
      if (selected && selected.id === requestId) {
        setSelected(null);
      }
    } catch (error) {
      console.error('Error declining request:', error);
      addNotification('Failed to decline request', 'error');
    }
  };

  const handleComplete = async (requestId) => {
    try {
      await updateRequestStatus(requestId, 'resolved');
      addNotification('Request marked as completed!', 'success');
    } catch (error) {
      console.error('Error completing request:', error);
      addNotification('Failed to complete request', 'error');
    }
  };

  // Chat functions
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selected) return;

    try {
      setChatLoading(true);
      await sendMessage(selected.id, {
        text: newMessage,
        senderId: user.uid,
        senderName: userData?.displayName || 'Volunteer',
        senderRole: 'volunteer'
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      addNotification('Failed to send message', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  // Donation functions
  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donationForm.title || !donationForm.description) {
      addNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      const donationData = {
        ...donationForm,
        amount: donationForm.type === 'monetary' ? parseFloat(donationForm.amount) : null,
        donorId: user.uid,
        donorName: userData?.displayName || 'Anonymous Volunteer',
        linkedRequestId: selected?.id || null,
        status: 'pending'
      };

      await createDonation(donationData);
      addNotification('Donation submitted successfully!', 'success');
      setShowDonationModal(false);
      setDonationForm({
        title: '',
        category: 'general',
        description: '',
        amount: '',
        type: 'monetary'
      });
    } catch (error) {
      console.error('Error creating donation:', error);
      addNotification('Failed to submit donation', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#d69e2e';
      case 'in-progress': return '#3182ce';
      case 'resolved': return '#38a169';
      case 'cancelled': return '#e53e3e';
      default: return '#718096';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return '#e53e3e';
      case 'high': return '#dd6b20';
      case 'medium': return '#d69e2e';
      case 'low': return '#38a169';
      default: return '#718096';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medical': return '🏥';
      case 'food': return '🍽️';
      case 'shelter': return '🏠';
      case 'transport': return '🚗';
      case 'clothing': return '👕';
      default: return '❓';
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'pending') return request.status === 'pending';
    if (filter === 'assigned') return request.assignedVolunteerId === user?.uid;
    if (filter === 'completed') return request.status === 'resolved';
    return true;
  });

  return (
    <div className="page-container" style={{ 
      background: '#f7f9fb', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                <h1 style={{
          color: '#2d3748',
          textAlign: 'center',
          marginBottom: '1rem',
          fontSize: '2.5rem',
          fontWeight: '700'
        }}>
          {t('volunteer.title') || 'Volunteer Dashboard'}
        </h1>
        


        {/* Panic Alerts Section */}
        {panicAlerts.length > 0 && (
          <div style={{ background: '#fff5f5', border: '1px solid #e53e3e', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h2 style={{ color: '#e53e3e', marginBottom: 12 }}>🚨 Active Panic Alerts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {panicAlerts.map(alert => (
                <div key={alert.id} style={{ 
                  background: '#fff', 
                  border: '1px solid #fed7d7', 
                  borderRadius: 8, 
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {alert.displayName || alert.email || 'User'}
                    </div>
                    <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                      {alert.location?.address || `Lat: ${alert.location?.lat}, Lng: ${alert.location?.lng}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {new Date(alert.timestamp?.seconds ? alert.timestamp.seconds * 1000 : Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {/* Respond button - first step */}
                    {!alert.respondedBy && (
                      <button
                        onClick={() => handlePanicAlertAction(alert.id, 'respond', alert)}
                        style={{
                          background: '#3182ce',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Respond
                      </button>
                    )}
                    
                    {/* Call and Message buttons - only after responding */}
                    {alert.respondedBy && !alert.resolved && alert.phone && (
                      <>
                        <button
                          onClick={() => handlePanicAlertAction(alert.id, 'call', alert)}
                          style={{
                            background: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          📞 Call Now
                        </button>
                        <button
                          onClick={() => handlePanicAlertAction(alert.id, 'message', alert)}
                          style={{
                            background: '#805ad5',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          💬 Message Now
                        </button>
                      </>
                    )}
                    
                    {/* Resolve button - after responding */}
                    {alert.respondedBy && !alert.resolved && (
                      <button
                        onClick={() => handlePanicAlertAction(alert.id, 'resolve', alert)}
                        style={{
                          background: '#38a169',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Resolve
                      </button>
                    )}
                    
                    {/* Status indicators */}
                    {alert.respondedBy && !alert.resolved && (
                      <span style={{ fontSize: 12, color: '#3182ce', fontWeight: 600 }}>
                        Responded
                      </span>
                    )}
                    {alert.resolved && (
                      <span style={{ fontSize: 12, color: '#38a169', fontWeight: 600 }}>
                        Resolved
                      </span>
                    )}
                    
                    {/* No phone number indicator - only after responding */}
                    {alert.respondedBy && !alert.resolved && !alert.phone && (
                      <span style={{ fontSize: 12, color: '#e53e3e', fontWeight: 600 }}>
                        No Phone Available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Map Section */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 4px 12px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16, fontSize: '1.5rem' }}>
            🗺️ Live Emergency Requests Map
          </h2>
          <div style={{ marginBottom: 16, color: '#718096' }}>
            View all active emergency requests on the map. Click on markers to see details and respond to requests.
          </div>
          <RequestsMap 
            onRequestSelect={(request) => {
              console.log('Selected request:', request);
              // You can add a modal or sidebar to show request details
            }}
          />
        </div>
        {/* Manual Location Modal */}
        {showManualLocationPrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.35)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              minWidth: 320,
              maxWidth: '90vw',
              textAlign: 'center',
              animation: 'popIn 0.2s',
            }}>
                          <h2 style={{ marginBottom: 16 }}>Enter Your Location</h2>
            <p style={{ marginBottom: 16 }}>We could not access your location automatically. Please enter your address <b>or</b> latitude and longitude manually.</p>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder="Enter your address (e.g. 123 Main St, City, Country)"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px', marginBottom: 8 }}
              />
              <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Or enter coordinates below:</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <input
                  type="number"
                  value={manualLat}
                  onChange={e => setManualLat(e.target.value)}
                  placeholder="Latitude (e.g. 23.8103)"
                  step="any"
                  style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
                />
                <input
                  type="number"
                  value={manualLng}
                  onChange={e => setManualLng(e.target.value)}
                  placeholder="Longitude (e.g. 90.4125)"
                  step="any"
                  style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                disabled={isGeocoding}
                onClick={handleManualLocationSave}
              >
                {isGeocoding ? (
                  <span className="spinner" style={{ marginRight: 8, border: '2px solid #fff', borderTop: '2px solid #3182ce', borderRadius: '50%', width: 16, height: 16, display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                ) : null}
                Save Location
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowManualLocationPrompt(false); setManualAddress(''); }}
                disabled={isGeocoding}
              >
                Cancel
              </button>
            </div>
            </div>
                          <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes popIn {
                  from { transform: scale(0.95); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
                .spinner {
                  border: 2px solid #e2e8f0;
                  border-top: 2px solid #3182ce;
                  border-radius: 50%;
                  width: 16px;
                  height: 16px;
                  display: inline-block;
                  animation: spin 1s linear infinite;
                }
              `}</style>
          </div>
        )}

        {/* Filter Controls */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 20, 
          boxShadow: '0 4px 12px #e2e8f0',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: '#4a5568' }}>Filter:</span>
            {['all', 'pending', 'assigned', 'completed'].map(filterOption => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                style={{ 
                  background: filter === filterOption ? '#667eea' : '#fff', 
                  color: filter === filterOption ? '#fff' : '#4a5568', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: 8, 
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Requests List */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 4px 12px #e2e8f0',
            border: '1px solid #e2e8f0',
            maxHeight: '70vh',
            overflow: 'auto'
          }}>
            <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '1.5rem', fontWeight: '600' }}>
              Emergency Requests
            </h2>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
                <div>Loading requests...</div>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
                <div>No requests found</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredRequests.map(request => (
                  <div
                    key={request.id}
                    onClick={() => setSelected(request)}
                    style={{ 
                      background: selected?.id === request.id ? '#f7fafc' : '#fff',
                      border: selected?.id === request.id ? '2px solid #667eea' : '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{getCategoryIcon(request.category)}</span>
                        <span style={{ fontWeight: '600', color: '#2d3748' }}>
                          {request.contact?.name || 'Anonymous'}
                        </span>
                        {request.panic && (
                          <span style={{ color: '#fff', background: '#e53e3e', borderRadius: 8, padding: '2px 8px', fontWeight: 700, marginLeft: 8, fontSize: 12, verticalAlign: 'middle' }}>PANIC</span>
                        )}
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 8,
                        fontSize: 12,
                        backgroundColor: getUrgencyColor(request.urgency),
                        color: '#fff',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {request.urgency}
                      </span>
                    </div>
                    
                    <p style={{ color: '#4a5568', marginBottom: 8, fontSize: '14px' }}>
                      {request.description?.substring(0, 100)}...
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: 12, 
                        fontSize: 12,
                        backgroundColor: getStatusColor(request.status),
                        color: '#fff',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {request.status}
                      </span>
                      {request.distance && (
                        <span style={{ fontSize: '12px', color: '#718096' }}>
                          📍 {request.distance} km away
                        </span>
                      )}
                    </div>
                    {/* Map for request location */}
                    <div style={{ marginTop: 8 }}>
                      <RequestLocationMap
                        latitude={request.latitude}
                        longitude={request.longitude}
                        panic={request.panic}
                        popupText={request.panic ? '🚨 Panic Alert' : request.title}
                      />
                    </div>
                    {/* Action Buttons */}
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAccept(request.id);
                          }}
                          style={{ 
                            background: '#38a169', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 6, 
                            padding: '6px 12px', 
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecline(request.id);
                          }}
                          style={{ 
                            background: '#e53e3e', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 6, 
                            padding: '6px 12px', 
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {request.assignedVolunteerId === user?.uid && request.status === 'in-progress' && (
                      <div style={{ marginTop: 12 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(request.id);
                          }}
                          style={{ 
                            background: '#3182ce', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 6, 
                            padding: '6px 12px', 
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          Mark Complete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat and Details Panel */}
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            padding: 24, 
            boxShadow: '0 4px 12px #e2e8f0',
            border: '1px solid #e2e8f0',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {selected ? (
              <>
                {/* Request Details */}
                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ color: '#2d3748', marginBottom: 12, fontSize: '1.2rem', fontWeight: '600' }}>
                    Request Details
                  </h3>
                  <div style={{ fontSize: '14px', color: '#4a5568' }}>
                    <p><strong>Category:</strong> {getCategoryIcon(selected.category)} {selected.category}</p>
                    <p><strong>Urgency:</strong> 
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: getUrgencyColor(selected.urgency),
                        color: '#fff',
                        marginLeft: 8
                      }}>
                        {selected.urgency}
                      </span>
                    </p>
                    <p><strong>Description:</strong> {selected.description}</p>
                    <p><strong>Contact:</strong> {selected.contact?.name} - {selected.contact?.phone}</p>
                    {selected.location && (
                      <p><strong>Location:</strong> 📍 {selected.location.lat.toFixed(4)}, {selected.location.lng.toFixed(4)}</p>
                    )}
                  </div>
                </div>

                {/* Chat Section */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <h4 style={{ color: '#2d3748', marginBottom: 12, fontSize: '1rem', fontWeight: '600' }}>
                    Chat with Requester
                  </h4>
                  
                  {/* Messages */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto', 
                    marginBottom: 12,
                    padding: 12,
                    background: '#f8fafc',
                    borderRadius: 8,
                    maxHeight: '200px'
                  }}>
                    {chatMessages.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      chatMessages.map((message, index) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: 8,
                            textAlign: message.senderRole === 'volunteer' ? 'right' : 'left'
                          }}
                        >
                          <div style={{
                            display: 'inline-block',
                            background: message.senderRole === 'volunteer' ? '#667eea' : '#e2e8f0',
                            color: message.senderRole === 'volunteer' ? '#fff' : '#2d3748',
                            padding: '8px 12px',
                            borderRadius: 12,
                            maxWidth: '80%',
                            fontSize: '14px'
                          }}>
                            <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: 4 }}>
                              {message.senderName}
                            </div>
                            {message.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: '14px'
                      }}
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || chatLoading}
                      style={{
                        background: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        opacity: (!newMessage.trim() || chatLoading) ? 0.5 : 1
                      }}
                    >
                      {chatLoading ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>

                {/* Donation Button */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => setShowDonationModal(true)}
                    style={{
                      background: '#38a169',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  >
                    💝 Make a Donation for this Request
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
          
                <div>Select a request to view details and chat</div>
              </div>
            )}
          </div>
        </div>

        {/* Donation Modal */}
        {showDonationModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ color: '#2d3748', marginBottom: 20, fontSize: '1.5rem', fontWeight: '600' }}>
                Make a Donation
              </h3>
              
              <form onSubmit={handleDonationSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                    Donation Type *
                  </label>
                  <select
                    value={donationForm.type}
                    onChange={(e) => setDonationForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: '14px'
                    }}
                  >
                    <option value="monetary">Monetary Donation</option>
                    <option value="goods">Goods/Items</option>
                    <option value="services">Services</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={donationForm.title}
                    onChange={(e) => setDonationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief description of your donation"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                    Category
                  </label>
                  <select
                    value={donationForm.category}
                    onChange={(e) => setDonationForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: '14px'
                    }}
                  >
                    <option value="general">General</option>
                    <option value="medical">Medical</option>
                    <option value="food">Food</option>
                    <option value="shelter">Shelter</option>
                    <option value="transport">Transport</option>
                    <option value="clothing">Clothing</option>
                  </select>
                </div>

                {donationForm.type === 'monetary' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                      Amount ($)
                    </label>
                    <input
                      type="number"
                      value={donationForm.amount}
                      onChange={(e) => setDonationForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                    Description *
                  </label>
                  <textarea
                    value={donationForm.description}
                    onChange={(e) => setDonationForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of your donation..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: '#38a169',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Submit Donation
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDonationModal(false)}
                    style={{
                      flex: 1,
                      background: '#e2e8f0',
                      color: '#4a5568',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 24px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerViewPage;