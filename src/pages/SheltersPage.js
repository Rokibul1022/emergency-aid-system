import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';

// Mock shelters data
const mockShelters = [
  {
    id: 1,
    name: 'Central Emergency Shelter',
    address: '123 Main St, Downtown',
    lat: 40.7128,
    lng: -74.0060,
    capacity: 200,
    occupied: 150,
    available: 50,
    status: 'open',
    contact: '+1234567890',
    description: 'Large emergency shelter with medical facilities',
    facilities: ['Medical', 'Food', 'Showers', 'Beds'],
    distance: 1.2,
  },
  {
    id: 2,
    name: 'Community Center Shelter',
    address: '456 Oak Ave, Midtown',
    lat: 40.7138,
    lng: -74.0020,
    capacity: 100,
    occupied: 80,
    available: 20,
    status: 'open',
    contact: '+1234567891',
    description: 'Community center converted to emergency shelter',
    facilities: ['Food', 'Showers', 'Beds'],
    distance: 2.5,
  },
  {
    id: 3,
    name: 'School Gymnasium Shelter',
    address: '789 Pine Rd, Uptown',
    lat: 40.7100,
    lng: -74.0100,
    capacity: 150,
    occupied: 120,
    available: 30,
    status: 'open',
    contact: '+1234567892',
    description: 'School gymnasium serving as temporary shelter',
    facilities: ['Food', 'Beds', 'Security'],
    distance: 0.8,
  },
  {
    id: 4,
    name: 'Church Hall Shelter',
    address: '321 Elm St, Westside',
    lat: 40.7150,
    lng: -74.0080,
    capacity: 80,
    occupied: 75,
    available: 5,
    status: 'limited',
    contact: '+1234567893',
    description: 'Church hall providing emergency accommodation',
    facilities: ['Food', 'Beds'],
    distance: 3.1,
  },
];

const SheltersPage = () => {
  const { t } = useTranslation();
  const { addNotification, getCurrentLocation } = useApp();
  const [shelters, setShelters] = useState(mockShelters);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filterStatus, setFilterStatus] = useState('all');
  const [userLocation, setUserLocation] = useState(null);

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

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setShelters(prev => prev.map(shelter => {
        // Randomly update occupancy
        if (Math.random() < 0.3) {
          const change = Math.floor(Math.random() * 10) - 5; // -5 to +5
          const newOccupied = Math.max(0, Math.min(shelter.capacity, shelter.occupied + change));
          return {
            ...shelter,
            occupied: newOccupied,
            available: shelter.capacity - newOccupied,
            status: newOccupied >= shelter.capacity * 0.9 ? 'limited' : 'open',
          };
        }
        return shelter;
      }));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleGetDirections = (shelter) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`;
    window.open(url, '_blank');
    addNotification(`Opening directions to ${shelter.name}`, 'info');
  };

  const handleContact = (shelter) => {
    addNotification(`Contact ${shelter.name} at ${shelter.contact}`, 'info');
  };

  const filteredShelters = shelters.filter(shelter => {
    if (filterStatus === 'all') return true;
    return shelter.status === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#000';
      case 'limited': return '#666';
      case 'full': return '#999';
      default: return '#ccc';
    }
  };

  const getOccupancyPercentage = (occupied, capacity) => {
    return Math.round((occupied / capacity) * 100);
  };

  return (
    <div className="page-container" style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 0' }}>
      <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32 }}>{t('shelters.title') || 'Emergency Shelters'}</h1>
      
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

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', maxWidth: 1200, margin: '0 auto' }}>
        {/* Shelters List/Map */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          {viewMode === 'list' ? (
            <>
              <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Shelters List</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                {filteredShelters.map(shelter => (
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
                        <div style={{ fontSize: 12, color: '#666' }}>{shelter.address}</div>
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
                        Capacity: {shelter.occupied}/{shelter.capacity} ({getOccupancyPercentage(shelter.occupied, shelter.capacity)}%)
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
                          width: `${getOccupancyPercentage(shelter.occupied, shelter.capacity)}%`, 
                          height: '100%', 
                          backgroundColor: getStatusColor(shelter.status) 
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                      Available: {shelter.available} spots • Distance: {shelter.distance} km
                    </div>
                    <div style={{ fontSize: 12, color: '#333' }}>{shelter.description}</div>
                  </div>
                ))}
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
                <div><b>Address:</b> {selectedShelter.address}</div>
                <div><b>Status:</b> {selectedShelter.status}</div>
                <div><b>Capacity:</b> {selectedShelter.occupied}/{selectedShelter.capacity} ({getOccupancyPercentage(selectedShelter.occupied, selectedShelter.capacity)}%)</div>
                <div><b>Available:</b> {selectedShelter.available} spots</div>
                <div><b>Distance:</b> {selectedShelter.distance} km</div>
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
      </div>
    </div>
  );
};

export default SheltersPage; 