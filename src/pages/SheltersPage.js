import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToShelters, getAvailableShelters } from '../firebase/shelters';
import { createShelterRequest, getShelterRequestsByRequester, subscribeToShelterRequests } from '../firebase/shelterRequests';
import { db } from '../firebase/config';
import BookingBuilder from '../utils/BookingBuilder';

// Default facilities for shelters
const defaultFacilities = ['Medical', 'Food', 'Showers', 'Beds', 'Security'];

const SheltersPage = () => {
  const { t } = useTranslation();
  const { addNotification, getCurrentLocation } = useApp();
  const { user, userData } = useAuth();
  const [shelters, setShelters] = useState([]);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filterStatus, setFilterStatus] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'book', or 'my-bookings'
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    numberOfPeople: 1,
    urgency: 'medium',
    specialNeeds: [],
    estimatedDuration: 1,
    notes: ''
  });
  const [userBookings, setUserBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Determine user role and available tabs
  const isRequester = userData?.role === 'requester' || !userData?.role;
  const availableTabs = isRequester 
    ? [
        { id: 'browse', label: 'Browse Shelters' },
        { id: 'book', label: 'Book & Contact' },
        { id: 'my-bookings', label: 'My Bookings' }
      ]
    : [
        { id: 'browse', label: 'Browse Shelters' }
      ];

  useEffect(() => {
    // Get user location for distance calculations
    const getUserLocation = async () => {
      try {
        const loc = await getCurrentLocation();
        setUserLocation(loc);
      } catch (err) {
        console.log('Could not get user location:', err);
        // Don't show notification for location unavailable
      }
    };
    
    getUserLocation();
  }, [getCurrentLocation]);

  // Simple fetch shelters once on component mount
  useEffect(() => {
    if (!user) return;
    
    const fetchShelters = async () => {
      try {
        setLoading(true);
        console.log('Fetching shelters...');
        
        const { collection, getDocs } = await import('firebase/firestore');
        const sheltersRef = collection(db, 'shelters');
        const snapshot = await getDocs(sheltersRef);
        
        const sheltersData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          sheltersData.push({
            id: doc.id,
            ...data,
            location: data.location ? {
              lat: data.location.latitude,
              lng: data.location.longitude
            } : null,
            available: (data.capacity || 0) - (data.occupied || 0),
            facilities: data.amenities || defaultFacilities
          });
        });
        
        console.log('Shelters fetched:', sheltersData.length);
        setShelters(sheltersData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching shelters:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchShelters();
  }, [user]);

  // Fetch user's bookings from text file
  useEffect(() => {
    if (!user) return;
    
    const fetchUserBookings = () => {
      try {
        // Get bookings from text file (localStorage)
        const allBookings = JSON.parse(localStorage.getItem('textFileBookings') || '[]');
        const userBookings = allBookings.filter(booking => 
          booking.requesterId === user.uid
        );
        
        console.log('User bookings fetched from text file:', userBookings.length);
        setUserBookings(userBookings);
        
      } catch (error) {
        console.error('Error fetching user bookings from text file:', error);
        setUserBookings([]);
      }
    };
    
    fetchUserBookings();
    
    // Refresh every 5 seconds to get updates
    const interval = setInterval(fetchUserBookings, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Reset active tab if user doesn't have access to current tab
  useEffect(() => {
    if (!availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab('browse');
    }
  }, [availableTabs, activeTab]);

  // Calculate distance between two points (Haversine formula)
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

  const handleGetDirections = (shelter) => {
    if (shelter.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${shelter.location.lat},${shelter.location.lng}`;
      window.open(url, '_blank');
      addNotification(`Opening directions to ${shelter.name}`, 'info');
    } else {
      addNotification('Location not available for this shelter', 'warning');
    }
  };

  const handleContact = (shelter) => {
    addNotification(`Contact ${shelter.name} at ${shelter.contact}`, 'info');
  };

  const handleBookShelter = (shelter) => {
    setSelectedShelter(shelter);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    console.log('Booking form submitted:', bookingForm);
    
    if (!user) {
      addNotification('Please log in to book a shelter', 'error');
      return;
    }

    if (!selectedShelter) {
      addNotification('No shelter selected for booking', 'error');
      return;
    }

    setSubmitting(true);
    
    try {
      const bookingData = new BookingBuilder(user, selectedShelter)
        .withUserData(userData)
        .withNumberOfPeople(bookingForm.numberOfPeople)
        .withUrgency(bookingForm.urgency)
        .withSpecialNeeds(bookingForm.specialNeeds)
        .withEstimatedDuration(bookingForm.estimatedDuration)
        .withNotes(bookingForm.notes)
        .build();

      console.log('Storing booking in text file:', bookingData);
      
      // Save to text file (simple approach)
      const existingBookings = JSON.parse(localStorage.getItem('textFileBookings') || '[]');
      existingBookings.push(bookingData);
      localStorage.setItem('textFileBookings', JSON.stringify(existingBookings));
      
      console.log('Booking saved to text file successfully');
      
      addNotification('Shelter booking submitted successfully! A volunteer will review your request.', 'success');
      setShowBookingModal(false);
      setBookingForm({
        numberOfPeople: 1,
        urgency: 'medium',
        specialNeeds: [],
        estimatedDuration: 1,
        notes: ''
      });
      
    } catch (error) {
      console.error('Error storing booking:', error);
      addNotification(`Failed to submit booking: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpecialNeedToggle = (need) => {
    setBookingForm(prev => ({
      ...prev,
      specialNeeds: prev.specialNeeds.includes(need)
        ? prev.specialNeeds.filter(n => n !== need)
        : [...prev.specialNeeds, need]
    }));
  };

  const handleManualFetch = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting manual fetch of shelters...');
      const { collection, getDocs } = await import('firebase/firestore');
      const sheltersRef = collection(db, 'shelters');
      const snapshot = await getDocs(sheltersRef);
      const sheltersData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sheltersData.push({
          id: doc.id,
          ...data,
          location: data.location ? {
            lat: data.location.latitude,
            lng: data.location.longitude
          } : null
        });
      });
      console.log('Manual fetch result:', sheltersData);
      setShelters(sheltersData);
      setLoading(false);
    } catch (error) {
      console.error('Manual fetch error:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const testShelterRequestPermissions = async () => {
    try {
      console.log('Testing shelter request permissions...');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Try to create a test document
      const testData = {
        test: true,
        timestamp: serverTimestamp(),
        userId: user?.uid || 'test'
      };
      
      const docRef = await addDoc(collection(db, 'shelter_requests'), testData);
      console.log('Test document created successfully:', docRef.id);
      
      // Delete the test document
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(docRef);
      console.log('Test document deleted successfully');
      
      addNotification('Firebase permissions test passed!', 'success');
    } catch (error) {
      console.error('Firebase permissions test failed:', error);
      addNotification(`Firebase permissions test failed: ${error.message}`, 'error');
      
      // Check if it's a permission issue
      if (error.code === 'permission-denied') {
        addNotification('This appears to be a Firebase permissions issue. Check your Firestore rules.', 'warning');
      }
    }
  };

  // Local storage fallback for when Firebase is unavailable
  const saveBookingToLocalStorage = (bookingData) => {
    try {
      const existingBookings = JSON.parse(localStorage.getItem('pendingShelterBookings') || '[]');
      const newBooking = {
        ...bookingData,
        id: `local_${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        isLocal: true
      };
      existingBookings.push(newBooking);
      localStorage.setItem('pendingShelterBookings', JSON.stringify(existingBookings));
      return newBooking;
    } catch (error) {
      console.error('Error saving to local storage:', error);
      return null;
    }
  };

  const getLocalBookings = () => {
    try {
      return JSON.parse(localStorage.getItem('pendingShelterBookings') || '[]');
    } catch (error) {
      console.error('Error reading from local storage:', error);
      return [];
    }
  };

  const syncLocalBookingsToFirebase = async () => {
    try {
      const localBookings = getLocalBookings();
      if (localBookings.length === 0) {
        addNotification('No local bookings to sync.', 'info');
        return;
      }

      let syncedCount = 0;
      for (const localBooking of localBookings) {
        try {
          // Remove local-specific fields
          const { id, isLocal, ...bookingData } = localBooking;
          await createShelterRequest(bookingData);
          syncedCount++;
        } catch (error) {
          console.error('Failed to sync local booking:', error);
        }
      }

      if (syncedCount > 0) {
        // Clear synced bookings from local storage
        localStorage.removeItem('pendingShelterBookings');
        addNotification(`Successfully synced ${syncedCount} local bookings to Firebase!`, 'success');
        
        // Refresh user bookings
        if (user) {
          const userBookingsData = await getShelterRequestsByRequester(user.uid);
          setUserBookings(userBookingsData);
        }
      }
    } catch (error) {
      console.error('Error syncing local bookings:', error);
      addNotification('Failed to sync local bookings to Firebase.', 'error');
    }
  };

  const filteredShelters = shelters.filter(shelter => {
    if (filterStatus === 'all') return true;
    return shelter.status === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#38a169';
      case 'limited': return '#d69e2e';
      case 'full': return '#e53e3e';
      default: return '#718096';
    }
  };

  const getOccupancyPercentage = (occupied, capacity) => {
    return Math.round((occupied / capacity) * 100);
  };

  return (
    <div className="page-container" style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 0' }}>
      <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32 }}>{t('shelters.title') || 'Emergency Shelters'}</h1>
      
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
          {availableTabs.map(tab => (
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

      {/* Tab Content */}
      {activeTab === 'browse' && (
        <>
      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setViewMode('list')}
              style={{ 
                background: viewMode === 'list' ? '#667eea' : '#fff', 
                color: viewMode === 'list' ? '#fff' : '#667eea', 
                border: '1px solid #667eea', 
                borderRadius: 4, 
                padding: '8px 16px',
                fontWeight: 600
              }}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              style={{ 
                background: viewMode === 'map' ? '#667eea' : '#fff', 
                color: viewMode === 'map' ? '#fff' : '#667eea', 
                border: '1px solid #667eea', 
                borderRadius: 4, 
                padding: '8px 16px',
                fontWeight: 600
              }}
            >
              Map View
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          >
            <option value="all">All Shelters</option>
            <option value="open">Open</option>
            <option value="limited">Limited</option>
            <option value="full">Full</option>
          </select>
        </div>
      </div>

          {/* Role-based message for volunteers/admins */}
          {!isRequester && (
            <div style={{ 
              background: '#f0f9ff', 
              border: '1px solid #0ea5e9', 
              borderRadius: 8, 
              padding: 16, 
              marginBottom: 20,
              color: '#0c4a6e'
            }}>
              <div style={{ fontWeight: '600', marginBottom: 4 }}>ℹ️ Information for Volunteers & Admins</div>
              <div style={{ fontSize: '14px' }}>
                You can view all shelters here. To manage shelters (add, edit, delete) and handle shelter requests, 
                please use the <strong>Volunteer Dashboard</strong> or <strong>Admin Panel</strong>.
              </div>
            </div>
          )}
          
          {/* Debug section for testing */}
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: 8, 
            padding: 16, 
            marginBottom: 20,
            color: '#92400e'
          }}>
            <div style={{ fontWeight: '600', marginBottom: 4 }}>🔧 Debug Information</div>
            <div style={{ fontSize: '14px', marginBottom: 8 }}>
              User ID: {user?.uid || 'Not logged in'} | Role: {userData?.role || 'Unknown'} | Shelters loaded: {shelters.length}
            </div>
            <button
              onClick={() => {
                console.log('Current shelters state:', shelters);
                console.log('User:', user);
                console.log('User data:', userData);
              }}
              style={{
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Log Debug Info
            </button>
            <button
              onClick={handleManualFetch}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Manual Fetch Shelters
            </button>
            <button
              onClick={testShelterRequestPermissions}
              style={{
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Test Permissions
            </button>
            <button
              onClick={() => {
                try {
                  const allBookings = JSON.parse(localStorage.getItem('textFileBookings') || '[]');
                  if (allBookings.length === 0) {
                    addNotification('No bookings to download.', 'info');
                    return;
                  }
                  
                  // Create and download text file
                  const dataStr = JSON.stringify(allBookings, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'shelter_bookings.json';
                  link.click();
                  URL.revokeObjectURL(url);
                  
                  addNotification(`Downloaded ${allBookings.length} bookings to text file!`, 'success');
                } catch (error) {
                  console.error('Error downloading bookings:', error);
                  addNotification('Failed to download bookings.', 'error');
                }
              }}
              style={{
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
            >
              Download Bookings
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const bookings = JSON.parse(e.target.result);
                        localStorage.setItem('textFileBookings', JSON.stringify(bookings));
                        addNotification(`Uploaded ${bookings.length} bookings from file!`, 'success');
                        // Refresh the page to show new data
                        window.location.reload();
                      } catch (error) {
                        addNotification('Invalid file format. Please upload a valid JSON file.', 'error');
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Upload Bookings
            </button>
            <button
              onClick={async () => {
                try {
                  console.log('Testing direct Firebase write...');
                  const testData = {
                    test: true,
                    timestamp: new Date().toISOString(),
                    userId: user?.uid || 'test'
                  };
                  const { collection, addDoc } = await import('firebase/firestore');
                  const docRef = await addDoc(collection(db, 'shelter_requests'), testData);
                  console.log('Test write successful:', docRef.id);
                  addNotification('Direct Firebase write test successful!', 'success');
                  
                  // Clean up test document
                  const { deleteDoc } = await import('firebase/firestore');
                  await deleteDoc(docRef);
                  console.log('Test document cleaned up');
                } catch (error) {
                  console.error('Direct Firebase write test failed:', error);
                  addNotification(`Direct Firebase write test failed: ${error.message}`, 'error');
                }
              }}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Test Direct Write
            </button>
          </div>
        </>
      )}

      {activeTab === 'book' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Book a Shelter</h2>
          <p style={{ color: '#718096', marginBottom: 16 }}>
            Browse available shelters below and click "Book Now" to submit your request. 
            A volunteer will review and approve your booking.
          </p>
          <div style={{ 
            background: '#f0f9ff', 
            border: '1px solid #0ea5e9', 
            borderRadius: 8, 
            padding: 12, 
            color: '#0c4a6e',
            fontSize: '14px'
          }}>
            <strong>Note:</strong> This feature is only available for requesters. Volunteers and admins should use the Volunteer Dashboard or Admin Panel for shelter management.
          </div>
        </div>
      )}

      {activeTab === 'my-bookings' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>My Shelter Bookings</h2>
          <p style={{ color: '#718096', marginBottom: 16 }}>
            Track the status of your shelter booking requests.
          </p>
          <div style={{ 
            background: '#f0f9ff', 
            border: '1px solid #0ea5e9', 
            borderRadius: 8, 
            padding: 12, 
            color: '#0c4a6e',
            fontSize: '14px'
          }}>
            <strong>Note:</strong> This feature is only available for requesters. Volunteers and admins can view all shelter requests in the Volunteer Dashboard or Admin Panel.
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', maxWidth: 1200, margin: '0 auto' }}>
        {activeTab === 'my-bookings' ? (
          // My Bookings Tab Content
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
            <h2 style={{ color: '#2d3748', marginBottom: 20 }}>My Shelter Bookings</h2>
            {!isRequester ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#e53e3e' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚫</div>
                <div>Access Restricted</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  This feature is only available for requesters. 
                  <br />Volunteers and admins can view all shelter requests in the Volunteer Dashboard or Admin Panel.
                </div>
              </div>
            ) : userBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                <div>No booking requests yet</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Go to the "Book & Contact" tab to request a shelter
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {userBookings.map(booking => (
                  <div
                    key={booking.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 20,
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ color: '#2d3748', margin: 0, marginBottom: 4 }}>{booking.shelterName}</h3>
                        <div style={{ fontSize: '14px', color: '#718096' }}>
                          Requested for {booking.numberOfPeople} people
                        </div>
                      </div>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: 12,
                        fontSize: '12px',
                        backgroundColor: 
                          booking.status === 'pending' ? '#d69e2e' :
                          booking.status === 'approved' ? '#38a169' :
                          booking.status === 'rejected' ? '#e53e3e' :
                          '#718096',
                        color: '#fff',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Urgency</div>
                        <div style={{ fontWeight: '600' }}>{booking.urgency}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Duration</div>
                        <div style={{ fontWeight: '600' }}>{booking.estimatedDuration} days</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Requested On</div>
                        <div style={{ fontWeight: '600' }}>
                          {new Date(booking.createdAt?.seconds ? booking.createdAt.seconds * 1000 : booking.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {booking.assignedAt && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Assigned On</div>
                          <div style={{ fontWeight: '600' }}>
                            {new Date(booking.assignedAt?.seconds ? booking.assignedAt.seconds * 1000 : booking.assignedAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {booking.specialNeeds && booking.specialNeeds.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Special Needs</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {booking.specialNeeds.map(need => (
                            <span key={need} style={{
                              background: '#f7fafc',
                              color: '#4a5568',
                              padding: '4px 8px',
                              borderRadius: 8,
                              fontSize: '12px',
                              border: '1px solid #e2e8f0'
                            }}>
                              {need}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {booking.notes && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Notes</div>
                        <div style={{ fontSize: '14px', color: '#4a5568' }}>{booking.notes}</div>
                      </div>
                    )}
                    
                    {booking.responseNotes && (
                      <div style={{ 
                        background: '#f0fff4', 
                        border: '1px solid #9ae6b4', 
                        borderRadius: 8, 
                        padding: 12,
                        marginTop: 12
                      }}>
                        <div style={{ fontSize: '12px', color: '#718096', marginBottom: 4 }}>Volunteer Response</div>
                        <div style={{ fontSize: '14px', color: '#2d3748' }}>{booking.responseNotes}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Browse and Book Tabs Content
          <>
        {/* Shelters List/Map */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          {viewMode === 'list' ? (
            <>
              <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Shelters List</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                    {loading ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '2rem', 
                        color: '#718096',
                        background: '#f7fafc',
                        borderRadius: 8,
                        border: '1px dashed #cbd5e0'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Loading Shelters...</div>
                        <div style={{ fontSize: '14px' }}>Please wait while we fetch shelter data</div>
                      </div>
                    ) : error ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '2rem', 
                        color: '#e53e3e',
                        background: '#fef2f2',
                        borderRadius: 8,
                        border: '1px dashed #fecaca'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>Error Loading Shelters</div>
                        <div style={{ fontSize: '14px', marginBottom: '16px' }}>{error}</div>
                        <button
                          onClick={handleManualFetch}
                          style={{
                            background: '#e53e3e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '8px 16px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    ) : filteredShelters.length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '2rem', 
                        color: '#718096',
                        background: '#f7fafc',
                        borderRadius: 8,
                        border: '1px dashed #cbd5e0'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏠</div>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>No Shelters Found</div>
                        <div style={{ fontSize: '14px', marginBottom: '16px' }}>
                          {shelters.length === 0 
                            ? 'No shelters have been added to the system yet.'
                            : 'No shelters match your current filter criteria.'
                          }
                        </div>
                        {shelters.length === 0 && (
                          <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                            Admins and volunteers can add shelters through the Admin Panel or Volunteer Dashboard.
                          </div>
                        )}
                      </div>
                    ) : (
                      filteredShelters.map(shelter => (
                  <div
                    key={shelter.id}
                    onClick={() => setSelectedShelter(shelter)}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'pointer',
                      backgroundColor: selectedShelter?.id === shelter.id ? '#e2e8f0' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h3 style={{ color: '#2d3748', margin: 0 }}>{shelter.name}</h3>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              {shelter.location ? `Lat: ${shelter.location.lat.toFixed(4)}, Lng: ${shelter.location.lng.toFixed(4)}` : 'Location not available'}
                            </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: 10, 
                          padding: '2px 8px', 
                          borderRadius: 12, 
                          backgroundColor: getStatusColor(shelter.status),
                          color: '#fff',
                          display: 'inline-block'
                        }}>
                          {shelter.status}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: '#666' }}>
                            Capacity: {shelter.occupied || 0}/{shelter.capacity || 0} ({getOccupancyPercentage(shelter.occupied || 0, shelter.capacity || 1)}%)
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: 8, 
                        backgroundColor: '#eee', 
                        borderRadius: 4, 
                        overflow: 'hidden',
                        marginTop: 4
                      }}>
                        <div style={{ 
                              width: `${getOccupancyPercentage(shelter.occupied || 0, shelter.capacity || 1)}%`, 
                          height: '100%', 
                          backgroundColor: getStatusColor(shelter.status) 
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                          Available: {shelter.available} spots • Distance: {shelter.distance || 'N/A'} km
                    </div>
                    <div style={{ fontSize: 12, color: '#333' }}>{shelter.description}</div>
                        
                                                 {/* Booking Button for Book Tab - Only for Requesters */}
                         {activeTab === 'book' && shelter.available > 0 && isRequester && (
                           <div style={{ marginTop: 12 }}>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleBookShelter(shelter);
                               }}
                               style={{
                                 background: '#38a169',
                                 color: '#fff',
                                 border: 'none',
                                 borderRadius: 6,
                                 padding: '8px 16px',
                                 fontSize: 12,
                                 cursor: 'pointer',
                                 fontWeight: '600'
                               }}
                             >
                               📋 Book Now
                             </button>
                           </div>
                         )}
                         
                         {/* Message for non-requesters in book tab */}
                         {activeTab === 'book' && !isRequester && (
                           <div style={{ marginTop: 12 }}>
                             <div style={{ 
                               fontSize: '12px', 
                               color: '#e53e3e', 
                               fontStyle: 'italic',
                               padding: '8px',
                               background: '#fef2f2',
                               border: '1px solid #fecaca',
                               borderRadius: 4
                             }}>
                               ⚠️ Booking restricted to requesters only
                             </div>
                           </div>
                         )}
                      </div>
                    ))
                    )}
              </div>
            </>
          ) : (
            <>
              <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Shelters Map</h2>
              <div style={{ 
                width: '100%', 
                height: 400, 
                background: '#f7f9fb', 
                borderRadius: 8, 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#333',
                fontSize: 18
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div>[Interactive Map Placeholder]</div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    {filteredShelters.length} shelters shown
                  </div>
                  {userLocation && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </div>
                  )}
                </div>
                {/* Mock shelter markers */}
                {filteredShelters.map((shelter, index) => (
                  <div
                    key={shelter.id}
                    style={{
                      position: 'absolute',
                      left: `${20 + (index * 15)}%`,
                      top: `${30 + (index * 10)}%`,
                      width: 20,
                      height: 20,
                      backgroundColor: getStatusColor(shelter.status),
                      borderRadius: '50%',
                      border: '2px solid #fff',
                      cursor: 'pointer',
                    }}
                    title={`${shelter.name} - ${shelter.available} available`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Shelter Details */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0', minHeight: 300 }}>
          {selectedShelter ? (
            <div>
              <h2 style={{ color: '#2d3748' }}>{selectedShelter.name}</h2>
              <div style={{ marginBottom: 16 }}>
                <div><b>Status:</b> {selectedShelter.status}</div>
                    <div><b>Capacity:</b> {selectedShelter.occupied || 0}/{selectedShelter.capacity || 0} ({getOccupancyPercentage(selectedShelter.occupied || 0, selectedShelter.capacity || 1)}%)</div>
                <div><b>Available:</b> {selectedShelter.available} spots</div>
                    {selectedShelter.distance && <div><b>Distance:</b> {selectedShelter.distance} km</div>}
                <div><b>Contact:</b> {selectedShelter.contact}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div><b>Description:</b></div>
                <p style={{ margin: '8px 0', color: '#333' }}>{selectedShelter.description}</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div><b>Facilities:</b></div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {selectedShelter.facilities.map(facility => (
                    <span key={facility} style={{ 
                      background: '#000', 
                      color: '#fff', 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 12 
                    }}>
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleGetDirections(selectedShelter)}
                  style={{ background: '#000', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px' }}
                >
                  Get Directions
                </button>
                <button
                  onClick={() => handleContact(selectedShelter)}
                  style={{ background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 4, padding: '8px 16px' }}
                >
                  Contact
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: '#888', fontStyle: 'italic' }}>Select a shelter to view details</div>
          )}
        </div>
          </>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedShelter && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
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
            <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '1.5rem', fontWeight: '600' }}>
              Book Shelter: {selectedShelter.name}
            </h2>
            
            <form onSubmit={handleBookingSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                  Number of People *
                </label>
                <input
                  type="number"
                  value={bookingForm.numberOfPeople}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                  min="1"
                  max={selectedShelter.available}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '14px' }}
                />
                <div style={{ fontSize: '12px', color: '#718096', marginTop: 4 }}>
                  Maximum {selectedShelter.available} people available
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                  Urgency Level *
                </label>
                <select
                  value={bookingForm.urgency}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, urgency: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '14px' }}
                >
                  <option value="low">Low - Can wait a few hours</option>
                  <option value="medium">Medium - Need within 1-2 hours</option>
                  <option value="high">High - Need within 30 minutes</option>
                  <option value="critical">Critical - Immediate need</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                  Special Needs
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Wheelchair Access', 'Medical Care', 'Children', 'Elderly', 'Pets', 'Mental Health Support'].map(need => (
                    <label key={need} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={bookingForm.specialNeeds.includes(need)}
                        onChange={() => handleSpecialNeedToggle(need)}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontSize: '14px' }}>{need}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                  Estimated Duration (days) *
                </label>
                <input
                  type="number"
                  value={bookingForm.estimatedDuration}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                  min="1"
                  max="30"
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>
                  Additional Notes
                </label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional information that might help volunteers assist you..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: submitting ? '#a0aec0' : '#38a169',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '12px 24px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {submitting ? '🔄 Submitting...' : '📋 Submit Booking Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
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
  );
};

export default SheltersPage;