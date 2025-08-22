import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const ActiveVolunteersPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch real volunteers from Firestore
    const q = query(collection(db, 'users'), where('role', '==', 'volunteer'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const volunteersData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Volunteer data:', data); // Log to inspect name field
        volunteersData.push({
          id: doc.id,
          name: data.name || data.displayName || 'Unnamed Volunteer', // Try displayName if name is missing
          email: data.email || '',
          phone: data.phone || '',
          location: data.location && typeof data.location === 'object' 
            ? `${data.location.lat}, ${data.location.lng}` 
            : data.location || '',
          status: data.status || 'active',
          rating: data.rating || 0,
          requestsHelped: data.requestsHelped || 0,
          joinDate: data.joinDate || '',
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          availability: data.availability || '',
          avatar: data.avatar || '👤'
        });
      });
      console.log('Fetched volunteers:', volunteersData);
      setVolunteers(volunteersData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching volunteers:', error);
      addNotification('Failed to load volunteers', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleContact = (volunteer) => {
    addNotification(`Contacting ${volunteer.name}...`, 'info');
    // In real app, this would open chat or contact form
  };

  const filteredVolunteers = volunteers.filter(volunteer => {
    const name = volunteer.name || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#fff', fontSize: '1.2rem' }}>Loading active volunteers...</div>
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
          Active Volunteers
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
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{volunteers.length}</div>
            <div style={{ color: '#4a5568' }}>Total Active</div>
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 30,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search volunteers..."
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
        </div>

        {/* Volunteers Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: 24
        }}>
          {filteredVolunteers.map((volunteer) => (
            <div key={volunteer.id} style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: 16
              }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#2d3748',
                  marginBottom: 8
                }}>
                  {volunteer.name}
                </h3>
                <div style={{ color: '#718096', marginBottom: 4 }}>Email: {volunteer.email}</div>
                <div style={{ color: '#718096' }}>Phone: {volunteer.phone}</div>
              </div>

              <div style={{
                display: 'flex',
                gap: 12
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContact(volunteer);
                  }}
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
              </div>
            </div>
          ))}
        </div>

        {filteredVolunteers.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>No volunteers found</div>
            <div>Try adjusting your search or filter criteria</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveVolunteersPage;