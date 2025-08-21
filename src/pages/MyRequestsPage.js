import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getRequestsByRequester, REQUEST_STATUS, subscribeToRequests } from '../firebase/requests';


// Builder class for constructing display-ready request objects
class RequestDisplayBuilder {
  constructor(request) {
    this.displayData = {
      id: request.id,
      category: request.category || 'unknown',
      description: request.description || '',
      status: request.status || 'unknown',
      urgency: request.urgency || 'unknown',
      createdAt: request.createdAt || null,
      updatedAt: request.updatedAt || null,
      resolvedAt: request.resolvedAt || null,
      assignedVolunteerId: request.assignedVolunteerId || null,
      location: request.location || null,
      statusColor: '#718096', // Default color
      statusLabel: request.status || 'Unknown',
      urgencyColor: '#718096', // Default color
      categoryIcon: '❓', // Default icon
      formattedCreatedAt: 'Recently',
      formattedUpdatedAt: 'Recently',
      formattedResolvedAt: null
    };
  }


  setStatus() {
    switch (this.displayData.status) {
      case REQUEST_STATUS.IN_PROGRESS:
        this.displayData.statusColor = '#3182ce';
        this.displayData.statusLabel = 'In Progress';
        break;
      case REQUEST_STATUS.RESOLVED:
        this.displayData.statusColor = '#38a169';
        this.displayData.statusLabel = 'Completed';
        break;
      case REQUEST_STATUS.PENDING:
        this.displayData.statusColor = '#d69e2e';
        this.displayData.statusLabel = 'Pending';
        break;
      case REQUEST_STATUS.CANCELLED:
        this.displayData.statusColor = '#e53e3e';
        this.displayData.statusLabel = 'Cancelled';
        break;
      default:
        this.displayData.statusColor = '#718096';
        this.displayData.statusLabel = this.displayData.status;
    }
    return this;
  }


  setUrgency() {
    switch (this.displayData.urgency) {
      case 'critical':
        this.displayData.urgencyColor = '#e53e3e';
        break;
      case 'high':
        this.displayData.urgencyColor = '#dd6b20';
        break;
      case 'medium':
        this.displayData.urgencyColor = '#d69e2e';
        break;
      case 'low':
        this.displayData.urgencyColor = '#38a169';
        break;
      default:
        this.displayData.urgencyColor = '#718096';
    }
    return this;
  }


  setCategoryIcon() {
    switch (this.displayData.category) {
      case 'medical':
        this.displayData.categoryIcon = '🏥';
        break;
      case 'food':
        this.displayData.categoryIcon = '🍽️';
        break;
      case 'shelter':
        this.displayData.categoryIcon = '🏠';
        break;
      case 'transport':
        this.displayData.categoryIcon = '🚗';
        break;
      case 'clothing':
        this.displayData.categoryIcon = '👕';
        break;
      default:
        this.displayData.categoryIcon = '❓';
    }
    return this;
  }


  setFormattedDates() {
    const formatDate = (timestamp) => {
      if (!timestamp) return 'Recently';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };


    this.displayData.formattedCreatedAt = formatDate(this.displayData.createdAt);
    this.displayData.formattedUpdatedAt = formatDate(this.displayData.updatedAt);
    if (this.displayData.resolvedAt) {
      this.displayData.formattedResolvedAt = formatDate(this.displayData.resolvedAt);
    }
    return this;
  }


  build() {
    return { ...this.displayData };
  }
}


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


  useEffect(() => {
    if (!user) return;


    const unsubscribe = subscribeToRequests((requestsData) => {
      setRequests(requestsData);
    }, { requesterId: user.uid });


    return () => unsubscribe();
  }, [user]);


  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });


  return (
    <div style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px #e2e8f0' }}>
          <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32, fontSize: '2.5rem', fontWeight: '700' }}>
            My Emergency Requests
          </h1>


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
                {new RequestDisplayBuilder({ status: value }).setStatus().build().statusLabel} ({requests.filter(r => r.status === value).length})
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
                  : `No ${new RequestDisplayBuilder({ status: filter }).setStatus().build().statusLabel.toLowerCase()} requests.`
                }
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {filteredRequests.map((req) => {
                const displayReq = new RequestDisplayBuilder(req)
                  .setStatus()
                  .setUrgency()
                  .setCategoryIcon()
                  .setFormattedDates()
                  .build();


                return (
                  <div key={displayReq.id} style={{
                    background: '#f7fafc',
                    border: `2px solid ${displayReq.statusColor}`,
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: '0 4px 12px #e2e8f0',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '2rem' }}>{displayReq.categoryIcon}</span>
                        <div>
                          <h2 style={{
                            color: '#2d3748',
                            margin: 0,
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            textTransform: 'capitalize'
                          }}>
                            {displayReq.category} Emergency
                          </h2>
                          <p style={{
                            color: '#4a5568',
                            margin: '8px 0 0 0',
                            fontSize: '1rem',
                            lineHeight: '1.5'
                          }}>
                            {displayReq.description}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <span style={{
                          background: displayReq.statusColor,
                          color: '#fff',
                          borderRadius: 12,
                          padding: '6px 16px',
                          fontWeight: 600,
                          fontSize: 14,
                          textTransform: 'uppercase'
                        }}>
                          {displayReq.statusLabel}
                        </span>
                        <span style={{
                          background: displayReq.urgencyColor,
                          color: '#fff',
                          borderRadius: 8,
                          padding: '4px 12px',
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: 'uppercase'
                        }}>
                          {displayReq.urgency}
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
                        <strong style={{ color: '#4a5568' }}>Created:</strong> {displayReq.formattedCreatedAt}
                      </div>
                      <div>
                        <strong style={{ color: '#4a5568' }}>Updated:</strong> {displayReq.formattedUpdatedAt}
                      </div>
                      {displayReq.resolvedAt && (
                        <div>
                          <strong style={{ color: '#4a5568' }}>Resolved:</strong> {displayReq.formattedResolvedAt}
                        </div>
                      )}
                      {displayReq.assignedVolunteerId && (
                        <div>
                          <strong style={{ color: '#4a5568' }}>Assigned to:</strong> Volunteer
                        </div>
                      )}
                    </div>


                    {displayReq.location && displayReq.location.lat && displayReq.location.lng && (
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
                        <span>Lat: {displayReq.location.lat.toFixed(4)}, Lng: {displayReq.location.lng.toFixed(4)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div style={{background:'#fff',margin:'24px auto',maxWidth:1000,padding:16,borderRadius:8,border:'1px solid #eee'}}>
        <h3 style={{fontSize:'1rem',color:'#888'}}>DEBUG: Raw Requests Data</h3>
        <pre style={{fontSize:'0.9rem',color:'#333',overflowX:'auto'}}>{JSON.stringify(requests, null, 2)}</pre>
      </div>
    </div>
  );
};


export default MyRequestsPage;


