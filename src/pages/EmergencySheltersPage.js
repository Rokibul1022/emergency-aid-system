import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const EmergencySheltersPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch real shelters from Firestore
    const unsubscribe = onSnapshot(collection(db, 'shelters'), (querySnapshot) => {
      const sheltersData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() || {};
        sheltersData.push({
          id: doc.id,
          name: data.name || 'Unnamed Shelter',
          capacity: parseInt(data.capacity) || 0,
          occupied: parseInt(data.occupied) || 0,
          availableSlots: Math.max(0, (parseInt(data.capacity) || 0) - (parseInt(data.occupied) || 0)),
          status: data.status || 'unknown',
          contact: data.contact || '',
          description: data.description || '',
          createdAt: data.createdAt 
            ? (data.createdAt.toDate ? data.createdAt.toDate().toLocaleString() : data.createdAt.toString())
            : 'N/A'
        });
      });
      setShelters(sheltersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching shelters:', error);
      addNotification('Failed to load shelters', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleContact = (shelter) => {
    addNotification(`Contacting ${shelter.name}...`, 'info');
    // In real app, this would open contact form or call
  };

  const handleGetDirections = (shelter) => {
    addNotification(`Getting directions to ${shelter.name}...`, 'info');
    // In real app, this would open maps (note: removed location, so this is a placeholder)
  };

  const filteredShelters = shelters.filter(shelter => {
    const matchesSearch = (shelter.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || (shelter.status || '').toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'open': return '#38a169';
      case 'full': return '#e53e3e';
      case 'maintenance': return '#d69e2e';
      default: return '#718096';
    }
  };

  const getOccupancyPercentage = (occupied, capacity) => {
    const occ = parseInt(occupied) || 0;
    const cap = parseInt(capacity) || 1; // Avoid division by zero
    return cap > 0 ? Math.round((occ / cap) * 100) : 0;
  };

  if (loading) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#fff', fontSize: '1.2rem' }}>Loading emergency shelters...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '40px 20px'
    }}>
      <div style={{ 
        maxWidth: 1200, 
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
          Emergency Shelters
        </h1>

        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          marginBottom: 40,
          padding: 24,
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: 12
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{shelters.length}</div>
            <div style={{ color: '#4a5568' }}>Total Shelters</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {shelters.filter(s => (s.status || '').toLowerCase() === 'open').length}
            </div>
            <div style={{ color: '#4a5568' }}>Currently Open</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {shelters.reduce((sum, s) => sum + (s.availableSlots || 0), 0)}
            </div>
            <div style={{ color: '#4a5568' }}>Available Slots</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 30,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search shelters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '2px solid #e2e8f0',
              fontSize: '1rem',
              flex: 1,
              minWidth: 200
            }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              border: '2px solid #e2e8f0',
              fontSize: '1rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="full">Full</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* Shelters Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 24
        }}>
          {filteredShelters.map((shelter) => (
            <div key={shelter.id} style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: '#2d3748',
                    marginBottom: 8
                  }}>
                    {shelter.name}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#718096',
                    lineHeight: 1.5,
                    marginBottom: 12
                  }}>
                    {shelter.description}
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 8
                }}>
                  <span style={{
                    background: getStatusColor(shelter.status),
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {shelter.status}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Contact</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>{shelter.contact}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Capacity</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>
                    {shelter.availableSlots}/{shelter.capacity} available
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Occupancy</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>
                    {getOccupancyPercentage(shelter.occupied, shelter.capacity)}%
                  </div>
                </div>
              </div>

              {/* Occupancy Bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  width: '100%',
                  height: 8,
                  background: '#e2e8f0',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${getOccupancyPercentage(shelter.occupied, shelter.capacity)}%`,
                    height: '100%',
                    background: getOccupancyPercentage(shelter.occupied, shelter.capacity) > 80
                      ? '#e53e3e'
                      : getOccupancyPercentage(shelter.occupied, shelter.capacity) > 60
                      ? '#d69e2e'
                      : '#38a169',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 8 }}>Created At</div>
                <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>
                  {shelter.createdAt}
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 12
              }}>
                <button
                  onClick={() => handleContact(shelter)}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Contact
                </button>
                <button
                  onClick={() => handleGetDirections(shelter)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Get Directions
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredShelters.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏠</div>
            <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>No shelters found</div>
            <div>Try adjusting your search or filter criteria</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencySheltersPage;