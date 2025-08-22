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
import { subscribeToAskedDonations } from '../firebase/donations'; // Use available export
import { subscribeToActivePanicAlerts } from '../firebase/alerts';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import RequestsMap from '../components/RequestsMap';
import { 
  getAllShelters, 
  createShelter, 
  updateShelter, 
  deleteShelter,
  subscribeToShelters 
} from '../firebase/shelters';
import { 
  getAllShelterRequests,
  approveShelterRequest,
  rejectShelterRequest,
  subscribeToShelterRequests,
  SHELTER_REQUEST_STATUS
} from '../firebase/shelterRequests';

// Donation categories aligned with DonationBoardPage.js
const DONATION_CATEGORIES = ['Food & Water', 'Medical', 'Shelter', 'Transport', 'Other'];

// Abstract base class for request handling using Template Method Pattern
class RequestHandler {
  handleRequest(requestId, action, user, addNotification) {
    try {
      this.validateRequest(requestId);
      this.performAction(requestId, action, user);
      this.notifySuccess(action, addNotification);
      this.updateUI(requestId, action);
    } catch (error) {
      this.handleError(error, addNotification);
    }
  }

  validateRequest(requestId) {
    throw new Error('validateRequest must be implemented by subclass');
  }

  performAction(requestId, action, user) {
    throw new Error('performAction must be implemented by subclass');
  }

  handleError(error, addNotification) {
    console.error(`Error in request handling: ${error.message}`);
    addNotification(`Failed to process request: ${error.message}`, 'error');
  }

  notifySuccess(action, addNotification) {
    addNotification(`Request ${action} successfully!`, 'success');
  }

  updateUI(requestId, action) {}
}

// Concrete class for handling emergency requests
class EmergencyRequestHandler extends RequestHandler {
  constructor(setRequests, setSelected) {
    super();
    this.setRequests = setRequests;
    this.setSelected = setSelected;
  }

  validateRequest(requestId) {
    if (!requestId) {
      throw new Error('Request ID is required');
    }
  }

  async performAction(requestId, action, user) {
    if (action === 'accept') {
      await assignVolunteerToRequest(requestId, user.uid);
      await updateRequestStatus(requestId, 'in-progress');
    } else if (action === 'decline') {
      await updateRequestStatus(requestId, 'cancelled');
    } else if (action === 'complete') {
      await updateRequestStatus(requestId, 'resolved');
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }
  }

  updateUI(requestId, action) {
    if (action === 'decline') {
      this.setSelected(null);
    }
    this.setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: action === 'accept' ? 'in-progress' : action === 'complete' ? 'resolved' : 'cancelled' }
        : req
    ));
  }
}

// Concrete class for handling shelter requests
class ShelterRequestHandler extends RequestHandler {
  constructor(setShelterRequests, setSelected) {
    super();
    this.setShelterRequests = setShelterRequests;
    this.setSelected = setSelected;
  }

  validateRequest(requestId) {
    if (!requestId) {
      throw new Error('Shelter request ID is required');
    }
  }

  async performAction(requestId, action, user) {
    if (action === 'approve') {
      await approveShelterRequest(requestId, user.uid);
    } else if (action === 'reject') {
      await rejectShelterRequest(requestId, user.uid);
    } else {
      throw new Error(`Unsupported action: ${action}`);
    }
  }

  updateUI(requestId, action) {
    if (action === 'reject') {
      this.setSelected(null);
    }
    this.setShelterRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, status: action }
        : req
    ));
  }
}

const VolunteerViewPage = () => {
  const { t } = useTranslation();
  const { addNotification, getCurrentLocation, setManualLocation } = useApp();
  const { user, userData } = useAuth();
  
  // Basic state
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  
  // Chat functionality
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Donation ask functionality
  const [askedDonations, setAskedDonations] = useState([]);
  const [selectedAsk, setSelectedAsk] = useState(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationForm, setDonationForm] = useState({
    title: '',
    category: DONATION_CATEGORIES[0],
    description: '',
    amount: '',
    type: 'monetary'
  });

  // Panic alerts
  const [panicAlerts, setPanicAlerts] = useState([]);
  const [showManualLocationPrompt, setShowManualLocationPrompt] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Shelter management state
  const [activeTab, setActiveTab] = useState('requests');
  const [shelters, setShelters] = useState([]);
  const [shelterRequests, setShelterRequests] = useState([]);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null);
  const [shelterForm, setShelterForm] = useState({
    name: '',
    capacity: '',
    contact: '',
    description: '',
    status: 'open',
    location: { lat: '', lng: '' },
  });

  // Request handlers
  const emergencyRequestHandler = new EmergencyRequestHandler(setRequests, setSelected);
  const shelterRequestHandler = new ShelterRequestHandler(setShelterRequests, setSelected);

  // Helper functions
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

  // Get user location for distance calculation
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
      } catch (error) {
        console.log('Location not available on mount:', error.message);
      }
    };
    getUserLocation();
  }, []);

  // Subscribe to real-time requests
  useEffect(() => {
    if (!user || !user.uid || !userData) return;
    const unsubscribe = subscribeToRequests((requestsData) => {
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

  // Subscribe to real-time shelters
  useEffect(() => {
    if (!user || !user.uid) return;
    const unsubscribe = subscribeToShelters((sheltersData) => {
      setShelters(sheltersData);
    });
    return () => unsubscribe();
  }, [user]);

  // Subscribe to real-time donation asks
  useEffect(() => {
    if (!user || !user.uid || userData?.role !== 'volunteer') return;
    
    const unsubscribe = subscribeToAskedDonations((donationsData) => {
      const donationsWithDistance = donationsData.map(donation => {
        if (userLocation && donation.location) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            donation.location.lat,
            donation.location.lng
          );
          return { ...donation, distance: distance.toFixed(1) };
        }
        return { ...donation, distance: null };
      });
      setAskedDonations(donationsWithDistance);
    });

    return () => unsubscribe();
  }, [user, userData, userLocation]);

  // Subscribe to shelter requests
  useEffect(() => {
    if (!user || !user.uid) return;
    
    setShelterRequests([]);
  }, [user]);

  // Subscribe to chat when a request is selected
  useEffect(() => {
    if (!selected || !user) return;
    const unsubscribe = subscribeToChat(selected.id, (messages) => {
      setChatMessages(messages);
    });
    return () => unsubscribe();
  }, [selected, user]);

  // Subscribe to real-time panic alerts
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActivePanicAlerts((alerts) => {
      setPanicAlerts(alerts);
    });
    return () => unsubscribe();
  }, [user]);

  // Event handlers using Template Method Pattern
  const handleEmergencyRequest = (requestId, action) => {
    emergencyRequestHandler.handleRequest(requestId, action, user, addNotification);
  };

  const handleShelterRequest = (requestId, action) => {
    shelterRequestHandler.handleRequest(requestId, action, user, addNotification);
  };

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

  // Shelter management functions
  const openAddShelter = () => {
    setEditingShelter(null);
    setShelterForm({ name: '', capacity: '', contact: '', description: '', status: 'open', location: { lat: '', lng: '' } });
    setShowShelterModal(true);
  };

  const openEditShelter = (shelter) => {
    setEditingShelter(shelter);
    setShelterForm({
      name: shelter.name || '',
      capacity: shelter.capacity || '',
      contact: shelter.contact || '',
      description: shelter.description || '',
      status: shelter.status || 'open',
      location: shelter.location || { lat: '', lng: '' },
    });
    setShowShelterModal(true);
  };

  const closeShelterModal = () => {
    setShowShelterModal(false);
    setEditingShelter(null);
  };

  const handleShelterFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'lat' || name === 'lng') {
      setShelterForm((prev) => ({ ...prev, location: { ...prev.location, [name]: value } }));
    } else {
      setShelterForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleShelterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingShelter) {
        await updateShelter(editingShelter.id, {
          ...shelterForm,
          capacity: parseInt(shelterForm.capacity),
          location: { lat: parseFloat(shelterForm.location.lat), lng: parseFloat(shelterForm.location.lng) },
        });
        setShelters((prev) => prev.map((s) => s.id === editingShelter.id ? { ...s, ...shelterForm, capacity: parseInt(shelterForm.capacity), location: { lat: parseFloat(shelterForm.location.lat), lng: parseFloat(shelterForm.location.lng) } } : s));
        addNotification('Shelter updated successfully!', 'success');
      } else {
        const newShelter = await createShelter({
          ...shelterForm,
          capacity: parseInt(shelterForm.capacity),
          location: { lat: parseFloat(shelterForm.location.lat), lng: parseFloat(shelterForm.location.lng) },
        });
        setShelters((prev) => [newShelter, ...prev]);
        addNotification('Shelter added successfully!', 'success');
      }
      closeShelterModal();
    } catch (error) {
      addNotification('Failed to save shelter', 'error');
    }
  };

  const handleDeleteShelter = async (shelterId) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) return;
    try {
      await deleteShelter(shelterId);
      setShelters((prev) => prev.filter((s) => s.id !== shelterId));
      addNotification('Shelter deleted successfully!', 'success');
    } catch (error) {
      addNotification('Failed to delete shelter', 'error');
    }
  };

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

  const handleLocationUpdate = async () => {
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      addNotification('Location updated successfully!', 'success');
    } catch (error) {
      setShowManualLocationPrompt(true);
    }
  };

  const handlePanicAlertAction = async (alertId, action, alert) => {
    try {
      if (action === 'respond') {
        await updateDoc(doc(db, 'panic_alerts', alertId), {
          respondedBy: user.uid,
          respondedAt: serverTimestamp(),
          status: 'responded'
        });
        addNotification('Panic alert marked as responded!', 'success');
      } else if (action === 'resolve') {
        await updateDoc(doc(db, 'panic_alerts', alertId), {
          resolvedBy: user.uid,
          resolvedAt: serverTimestamp(),
          resolved: true,
          status: 'resolved'
        });
        addNotification('Panic alert marked as resolved!', 'success');
      } else if (action === 'call') {
        if (alert.phone) {
          window.open(`tel:${alert.phone}`, '_self');
          addNotification('Initiating call to requester...', 'info');
        } else {
          addNotification('No phone number available for this requester', 'warning');
        }
      } else if (action === 'message') {
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

  // Filter requests
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
        
        {/* Tab Navigation */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 20, 
          boxShadow: '0 4px 12px #e2e8f0',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'requests', label: 'Emergency Requests' },
              { id: 'donation-asks', label: 'Donation Asks' },
              { id: 'shelters', label: 'Shelter Management' },
              { id: 'shelter-requests', label: 'Shelter Requests' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  background: activeTab === tab.id ? '#667eea' : '#fff', 
                  color: activeTab === tab.id ? '#fff' : '#4a5568', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: 8, 
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panic Alerts Section - Always visible */}
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
                            cursor: 'pointer'
                          }}
                        >
                          📞 Call
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
                            cursor: 'pointer'
                          }}
                        >
                          💬 SMS
                        </button>
                      </>
                    )}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'requests' && (
          <>
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
                }}
              />
            </div>

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

                        {/* Action Buttons */}
                        {request.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEmergencyRequest(request.id, 'accept');
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
                                handleEmergencyRequest(request.id, 'decline');
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
                                handleEmergencyRequest(request.id, 'complete');
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
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#718096', padding: '2rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
                    <div>Select a request to view details and chat</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'donation-asks' && (
          <div>
            <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Donation Asks</h2>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Requester</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Title</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Type</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {askedDonations.map(ask => (
                    <tr key={ask.id}>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600 }}>{ask.requesterName || 'Anonymous'}</div>
                      </td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{ask.title}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{ask.category}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{ask.type}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: 12, 
                          fontSize: 12,
                          backgroundColor: ask.status === 'pending' ? '#d69e2e' : ask.status === 'accepted' ? '#38a169' : '#e53e3e',
                          color: '#fff',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {ask.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shelters' && (
          <div>
            <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Shelter Management</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                onClick={openAddShelter}
                style={{
                  background: '#3182ce',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >
                + Add Shelter
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Capacity</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Occupied</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Available</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shelters.map(shelter => (
                    <tr key={shelter.id}>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.name}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.capacity}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.occupied || 0}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{(shelter.capacity || 0) - (shelter.occupied || 0)}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: 12, 
                          fontSize: 12,
                          backgroundColor: shelter.status === 'open' ? '#38a169' : '#e53e3e',
                          color: '#fff',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {shelter.status}
                        </span>
                      </td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => openEditShelter(shelter)}
                            style={{ 
                              background: '#3182ce', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: 6, 
                              padding: '6px 12px', 
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteShelter(shelter.id)}
                            style={{ 
                              background: '#e53e3e', 
                              color: '#fff', 
                              border: 'none', 
                              borderRadius: 6, 
                              padding: '6px 12px', 
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shelter-requests' && (
          <div>
            <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Shelter Requests</h2>
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => {
                  try {
                    const allBookings = JSON.parse(localStorage.getItem('textFileBookings') || '[]');
                    console.log('Loading all bookings:', allBookings);
                    
                    if (allBookings.length === 0) {
                      addNotification('No bookings found. Submit a booking first as a requester.', 'info');
                      return;
                    }
                    
                    setShelterRequests(allBookings);
                    addNotification(`Loaded ${allBookings.length} booking(s)!`, 'success');
                  } catch (error) {
                    console.error('Error loading bookings:', error);
                    addNotification('Failed to load bookings.', 'error');
                  }
                }}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                📁 Load Bookings from File
              </button>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Requester</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Shelter</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>People</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Urgency</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shelterRequests.map(request => (
                    <tr key={request.id}>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 600 }}>{request.requesterName}</div>
                        <div style={{ fontSize: 12, color: '#718096' }}>{request.requesterPhone}</div>
                      </td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{request.shelterName}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{request.numberOfPeople}</td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 8,
                          fontSize: 12,
                          backgroundColor: request.urgency === 'critical' ? '#e53e3e' : request.urgency === 'high' ? '#dd6b20' : '#d69e2e',
                          color: '#fff',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {request.urgency}
                        </span>
                      </td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: 12, 
                          fontSize: 12,
                          backgroundColor: request.status === 'pending' ? '#d69e2e' : request.status === 'approved' ? '#38a169' : '#e53e3e',
                          color: '#fff',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {request.status}
                        </span>
                      </td>
                      <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                        {request.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleShelterRequest(request.id, 'approve')}
                              style={{ 
                                background: '#38a169', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: 6, 
                                padding: '6px 12px', 
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleShelterRequest(request.id, 'reject')}
                              style={{ 
                                background: '#e53e3e', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: 6, 
                                padding: '6px 12px', 
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
            justifyContent: 'center'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 32,
              minWidth: 320,
              maxWidth: '90vw',
              textAlign: 'center'
            }}>
              <h2 style={{ marginBottom: 16 }}>Enter Your Location</h2>
              <p style={{ marginBottom: 16 }}>Please enter your address or coordinates</p>
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={e => setManualAddress(e.target.value)}
                  placeholder="Enter your address"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="number"
                    value={manualLat}
                    onChange={e => setManualLat(e.target.value)}
                    placeholder="Latitude"
                    step="any"
                    style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
                  />
                  <input
                    type="number"
                    value={manualLng}
                    onChange={e => setManualLng(e.target.value)}
                    placeholder="Longitude"
                    step="any"
                    style={{ flex: 1, padding: '12px 12px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button
                  onClick={handleManualLocationSave}
                  disabled={isGeocoding}
                  style={{
                    background: '#3182ce',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Save Location
                </button>
                <button
                  onClick={() => setShowManualLocationPrompt(false)}
                  style={{
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
            </div>
          </div>
        )}

        {/* Shelter Modal */}
        {showShelterModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <form onSubmit={handleShelterSubmit} style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h3 style={{ color: '#2d3748', marginBottom: 20, fontSize: '1.3rem', fontWeight: '600' }}>{editingShelter ? 'Edit Shelter' : 'Add Shelter'}</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Name</label>
                <input name="name" value={shelterForm.name} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Capacity</label>
                <input name="capacity" type="number" value={shelterForm.capacity} onChange={handleShelterFormChange} required min={1} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Contact</label>
                <input name="contact" value={shelterForm.contact} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Description</label>
                <textarea name="description" value={shelterForm.description} onChange={handleShelterFormChange} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Latitude</label>
                  <input name="lat" type="number" value={shelterForm.location.lat} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Longitude</label>
                  <input name="lng" type="number" value={shelterForm.location.lng} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Status</label>
                <select name="status" value={shelterForm.status} onChange={handleShelterFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="limited">Limited</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeShelterModal} style={{ background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>{editingShelter ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerViewPage;


