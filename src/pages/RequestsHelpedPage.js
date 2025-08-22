import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const RequestsHelpedPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch real donations from Firestore
    const unsubscribe = onSnapshot(collection(db, 'donations'), (querySnapshot) => {
      const donationsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() || {};
        donationsData.push({
          id: doc.id,
          title: data.description || 'Unnamed Donation', // Using description as title
          description: data.description || '',
          category: data.category || 'Other',
          urgency: 'Completed', // Static since all are assumed completed
          status: 'completed', // Static since all are assumed completed
          requesterName: data.donorName || 'Unknown Donor',
          volunteerName: data.claimedByName || 'Unclaimed',
          completedDate: data.approvedAt 
            ? (data.approvedAt.toDate ? data.approvedAt.toDate().toLocaleString() : data.approvedAt.toString())
            : 'N/A',
          responseTime: 'N/A', // Not in schema, default to N/A
          rating: 0, // Not in schema, default to 0
          feedback: 'N/A' // Not in schema, default to N/A
        });
      });
      setDonations(donationsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching donations:', error);
      addNotification('Failed to load donations', 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleViewDetails = (donation) => {
    addNotification(`Viewing details for donation: ${donation.title}`, 'info');
    // In real app, this would navigate to detailed view
  };

  const handleContactVolunteer = (donation) => {
    addNotification(`Contacting volunteer: ${donation.volunteerName}`, 'info');
    // In real app, this would open chat or contact form
  };

  const filteredDonations = donations.filter(donation => {
    const matchesSearch = (donation.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (donation.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (donation.requesterName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (donation.volunteerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || (donation.category || '').toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Completed': return '#38a169'; // Static color for completed donations
      default: return '#718096';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#38a169';
      default: return '#718096';
    }
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
        <div style={{ color: '#fff', fontSize: '1.2rem' }}>Loading helped donations...</div>
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
          Donations Helped
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
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{donations.length}</div>
            <div style={{ color: '#4a5568' }}>Total Helped</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {(donations.reduce((sum, d) => sum + d.rating, 0) / donations.length).toFixed(1)}
            </div>
            <div style={{ color: '#4a5568' }}>Avg Rating</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              N/A
            </div>
            <div style={{ color: '#4a5568' }}>Avg Response (min)</div>
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
            placeholder="Search donations..."
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
            <option value="all">All Categories</option>
            <option value="Medical">Medical</option>
            <option value="Food & Water">Food & Water</option>
            <option value="Shelter">Shelter</option>
            <option value="Transport">Transport</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Donations Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 24
        }}>
          {filteredDonations.map((donation) => (
            <div key={donation.id} style={{
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
            onClick={() => handleViewDetails(donation)}
            >
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
                    {donation.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#718096',
                    lineHeight: 1.5,
                    marginBottom: 12
                  }}>
                    {donation.description}
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 8
                }}>
                  <span style={{
                    background: getUrgencyColor(donation.urgency),
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {donation.urgency}
                  </span>
                  <span style={{
                    background: getStatusColor(donation.status),
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {donation.status}
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
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Donor</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>{donation.requesterName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Claimed By</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>{donation.volunteerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Amount</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>{donation.amount || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Response Time</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>{donation.responseTime}</div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16
              }}>
                <span style={{ fontSize: '0.8rem', color: '#718096' }}>Rating:</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} style={{ color: star <= donation.rating ? '#fbbf24' : '#e2e8f0' }}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>
                  {donation.rating}/5
                </span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Feedback</div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#2d3748',
                  fontStyle: 'italic',
                  background: 'rgba(102, 126, 234, 0.05)',
                  padding: 12,
                  borderRadius: 8,
                  borderLeft: '3px solid #667eea'
                }}>
                  "{donation.feedback}"
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 12
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(donation);
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
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContactVolunteer(donation);
                  }}
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
                  Contact Volunteer
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDonations.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>No donations found</div>
            <div>Try adjusting your search or filter criteria</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsHelpedPage;