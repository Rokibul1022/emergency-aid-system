import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const RequestsHelpedPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for helped requests
  const mockRequests = [
    {
      id: 1,
      title: 'Medical Emergency - Heart Attack',
      description: 'Elderly man experiencing chest pain and shortness of breath',
      category: 'Medical',
      urgency: 'Critical',
      status: 'completed',
      requesterName: 'John Smith',
      volunteerName: 'Dr. Sarah Johnson',
      location: 'Downtown Medical Center',
      completedDate: '2024-01-15',
      responseTime: '3 minutes',
      rating: 5,
      feedback: 'Excellent response time and professional care provided.'
    },
    {
      id: 2,
      title: 'Food & Water Crisis',
      description: 'Family of 4 stranded without food for 2 days',
      category: 'Food & Water',
      urgency: 'High',
      status: 'completed',
      requesterName: 'Maria Garcia',
      volunteerName: 'Mike Chen',
      location: 'Westside Community',
      completedDate: '2024-01-14',
      responseTime: '15 minutes',
      rating: 5,
      feedback: 'Volunteer was very kind and provided more than we needed.'
    },
    {
      id: 3,
      title: 'Shelter Needed - Homeless Family',
      description: 'Family with 2 children need temporary shelter',
      category: 'Shelter',
      urgency: 'High',
      status: 'completed',
      requesterName: 'David Wilson',
      volunteerName: 'Emma Rodriguez',
      location: 'North District Shelter',
      completedDate: '2024-01-13',
      responseTime: '25 minutes',
      rating: 4,
      feedback: 'Found us a safe place to stay for the night.'
    },
    {
      id: 4,
      title: 'Transportation Emergency',
      description: 'Pregnant woman needs urgent transport to hospital',
      category: 'Transport',
      urgency: 'Critical',
      status: 'completed',
      requesterName: 'Lisa Thompson',
      volunteerName: 'David Kim',
      location: 'Eastside Hospital',
      completedDate: '2024-01-12',
      responseTime: '8 minutes',
      rating: 5,
      feedback: 'Saved my baby\'s life. Forever grateful!'
    },
    {
      id: 5,
      title: 'Medical Supplies Needed',
      description: 'Diabetes patient needs insulin urgently',
      category: 'Medical',
      urgency: 'High',
      status: 'completed',
      requesterName: 'Robert Brown',
      volunteerName: 'Lisa Thompson',
      location: 'South District Pharmacy',
      completedDate: '2024-01-11',
      responseTime: '12 minutes',
      rating: 5,
      feedback: 'Quick response and professional assistance.'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setRequests(mockRequests);
      setLoading(false);
    }, 1000);
  }, []);

  const handleViewDetails = (request) => {
    addNotification(`Viewing details for request: ${request.title}`, 'info');
    // In real app, this would navigate to detailed view
  };

  const handleContactVolunteer = (request) => {
    addNotification(`Contacting volunteer: ${request.volunteerName}`, 'info');
    // In real app, this would open chat or contact form
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.volunteerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || request.category === filter;
    return matchesSearch && matchesFilter;
  });

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Critical': return '#e53e3e';
      case 'High': return '#d69e2e';
      case 'Medium': return '#3182ce';
      case 'Low': return '#38a169';
      default: return '#718096';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#38a169';
      case 'in-progress': return '#d69e2e';
      case 'pending': return '#3182ce';
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
        <div style={{ color: '#fff', fontSize: '1.2rem' }}>Loading helped requests...</div>
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
          Requests Helped
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
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{requests.length}</div>
            <div style={{ color: '#4a5568' }}>Total Helped</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {(requests.reduce((sum, r) => sum + r.rating, 0) / requests.length).toFixed(1)}
            </div>
            <div style={{ color: '#4a5568' }}>Avg Rating</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {Math.round(requests.reduce((sum, r) => sum + parseInt(r.responseTime), 0) / requests.length)}
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
            placeholder="Search requests..."
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

        {/* Requests Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 24
        }}>
          {filteredRequests.map((request) => (
            <div key={request.id} style={{
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
            onClick={() => handleViewDetails(request)}
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
                    {request.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#718096',
                    lineHeight: 1.5,
                    marginBottom: 12
                  }}>
                    {request.description}
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 8
                }}>
                  <span style={{
                    background: getUrgencyColor(request.urgency),
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {request.urgency}
                  </span>
                  <span style={{
                    background: getStatusColor(request.status),
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {request.status}
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
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Requester</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>{request.requesterName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Volunteer</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>{request.volunteerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Location</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>{request.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Response Time</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>{request.responseTime}</div>
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
                    <span key={star} style={{ color: star <= request.rating ? '#fbbf24' : '#e2e8f0' }}>
                      ⭐
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>
                  {request.rating}/5
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
                  "{request.feedback}"
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: 12
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(request);
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
                    handleContactVolunteer(request);
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

        {filteredRequests.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#718096'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>No requests found</div>
            <div>Try adjusting your search or filter criteria</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsHelpedPage; 