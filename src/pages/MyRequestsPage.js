import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getRequestsByRequester, subscribeToRequests, REQUEST_STATUS } from '../firebase/requests';

const MyRequestsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadUserRequests = async () => {
      try {
        setLoading(true);
        console.log('MyRequestsPage: Loading requests for user:', user?.uid);
        const userRequests = await getRequestsByRequester(user.uid);
        console.log('MyRequestsPage: Loaded requests:', userRequests);
        setRequests(userRequests);
        // Debug: log each request's fields
        userRequests.forEach((req, idx) => {
          console.log(`Request ${idx + 1}:`, req);
        });
      } catch (error) {
        console.error('Error loading user requests:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUserRequests();
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToRequests((requestsData) => {
      setRequests(requestsData); // Firestore already filtered by requesterId
    }, { requesterId: user.uid });

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case REQUEST_STATUS.IN_PROGRESS: return '#3182ce';
      case REQUEST_STATUS.RESOLVED: return '#38a169';
      case REQUEST_STATUS.PENDING: return '#d69e2e';
      case REQUEST_STATUS.CANCELLED: return '#e53e3e';
      default: return '#718096';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case REQUEST_STATUS.IN_PROGRESS: return 'In Progress';
      case REQUEST_STATUS.RESOLVED: return 'Completed';
      case REQUEST_STATUS.PENDING: return 'Pending';
      case REQUEST_STATUS.CANCELLED: return 'Cancelled';
      default: return status;
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
    return request.status === filter;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px #e2e8f0' }}>
          <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32, fontSize: '2.5rem', fontWeight: '700' }}>
            My Emergency Requests
          </h1>

          {/* Filter Buttons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '8px 16px',
                border: filter === 'all' ? '2px solid #667eea' : '2px solid #e2e8f0',
                borderRadius: 20,
                background: filter === 'all' ? '#667eea' : '#fff',
                color: filter === 'all' ? '#fff' : '#4a5568',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              All ({requests.length})
            </button>
            {Object.entries(REQUEST_STATUS).map(([key, value]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  padding: '8px 16px',
                  border: filter === value ? '2px solid #667eea' : '2px solid #e2e8f0',
                  borderRadius: 20,
                  background: filter === value ? '#667eea' : '#fff',
                  color: filter === value ? '#fff' : '#4a5568',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {getStatusLabel(value)} ({requests.filter(r => r.status === value).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              color: '#667eea', 
              fontSize: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '2rem' }}>🔄</div>
              <div>Loading your requests...</div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              color: '#718096', 
              fontSize: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '3rem' }}>📝</div>
              <div>
                {filter === 'all' 
                  ? 'No requests found. Submit your first emergency request!' 
                  : `No ${getStatusLabel(filter).toLowerCase()} requests.`
                }
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {filteredRequests.map((req) => (
                <div key={req.id} style={{
                  background: '#f7fafc',
                  border: `2px solid ${getStatusColor(req.status)}`,
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 4px 12px #e2e8f0',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '2rem' }}>{getCategoryIcon(req.category)}</span>
                      <div>
                        <h2 style={{ 
                          color: '#2d3748', 
                          margin: 0, 
                          fontSize: '1.5rem',
                          fontWeight: '600',
                          textTransform: 'capitalize'
                        }}>
                          {req.category} Emergency
                        </h2>
                        <p style={{ 
                          color: '#4a5568', 
                          margin: '8px 0 0 0',
                          fontSize: '1rem',
                          lineHeight: '1.5'
                        }}>
                          {req.description}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span style={{
                        background: getStatusColor(req.status),
                        color: '#fff',
                        borderRadius: 12,
                        padding: '6px 16px',
                        fontWeight: 600,
                        fontSize: 14,
                        textTransform: 'uppercase'
                      }}>
                        {getStatusLabel(req.status)}
                      </span>
                      <span style={{
                        background: getUrgencyColor(req.urgency),
                        color: '#fff',
                        borderRadius: 8,
                        padding: '4px 12px',
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: 'uppercase'
                      }}>
                        {req.urgency}
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 16, 
                    fontSize: 14, 
                    color: '#718096',
                    background: '#fff',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0'
                  }}>
                    <div>
                      <strong style={{ color: '#4a5568' }}>Created:</strong> {formatDate(req.createdAt)}
                    </div>
                    <div>
                      <strong style={{ color: '#4a5568' }}>Updated:</strong> {formatDate(req.updatedAt)}
                    </div>
                    {req.resolvedAt && (
                      <div>
                        <strong style={{ color: '#4a5568' }}>Resolved:</strong> {formatDate(req.resolvedAt)}
                      </div>
                    )}
                    {req.assignedVolunteerId && (
                      <div>
                        <strong style={{ color: '#4a5568' }}>Assigned to:</strong> Volunteer
                      </div>
                    )}
                  </div>

                  {req.location && (
                    <div style={{ 
                      marginTop: 16,
                      background: '#fff',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 14,
                      color: '#718096'
                    }}>
                      <span>📍</span>
                      <span>Lat: {req.location.lat.toFixed(4)}, Lng: {req.location.lng.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* DEBUG: Show raw requests data */}
      <div style={{background:'#fff',margin:'24px auto',maxWidth:1000,padding:16,borderRadius:8,border:'1px solid #eee'}}>
        <h3 style={{fontSize:'1rem',color:'#888'}}>DEBUG: Raw Requests Data</h3>
        <pre style={{fontSize:'0.9rem',color:'#333',overflowX:'auto'}}>{JSON.stringify(requests, null, 2)}</pre>
      </div>
    </div>
  );
};

export default MyRequestsPage; 