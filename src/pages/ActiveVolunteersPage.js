import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const ActiveVolunteersPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for active volunteers
  const mockVolunteers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+1-555-0123',
      location: 'Downtown Area',
      status: 'active',
      rating: 4.8,
      requestsHelped: 45,
      joinDate: '2023-01-15',
      specialties: ['Medical', 'Transport'],
      availability: 'Weekdays 9AM-5PM',
      avatar: '👩‍⚕️'
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike.chen@email.com',
      phone: '+1-555-0124',
      location: 'Westside',
      status: 'active',
      rating: 4.9,
      requestsHelped: 67,
      joinDate: '2022-11-20',
      specialties: ['Food & Water', 'Shelter'],
      availability: 'Weekends',
      avatar: '👨‍🍳'
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      email: 'emma.r@email.com',
      phone: '+1-555-0125',
      location: 'North District',
      status: 'active',
      rating: 4.7,
      requestsHelped: 32,
      joinDate: '2023-03-10',
      specialties: ['Medical', 'Other'],
      availability: 'Evenings',
      avatar: '👩‍⚕️'
    },
    {
      id: 4,
      name: 'David Kim',
      email: 'david.kim@email.com',
      phone: '+1-555-0126',
      location: 'Eastside',
      status: 'active',
      rating: 4.6,
      requestsHelped: 28,
      joinDate: '2023-02-05',
      specialties: ['Transport', 'Shelter'],
      availability: 'Flexible',
      avatar: '🚗'
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      email: 'lisa.t@email.com',
      phone: '+1-555-0127',
      location: 'South District',
      status: 'active',
      rating: 4.9,
      requestsHelped: 89,
      joinDate: '2022-08-15',
      specialties: ['Medical', 'Food & Water'],
      availability: '24/7',
      avatar: '👩‍⚕️'
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setVolunteers(mockVolunteers);
      setLoading(false);
    }, 1000);
  }, []);

  const handleContact = (volunteer) => {
    addNotification(`Contacting ${volunteer.name}...`, 'info');
    // In real app, this would open chat or contact form
  };

  const handleViewProfile = (volunteer) => {
    addNotification(`Viewing ${volunteer.name}'s profile...`, 'info');
    // In real app, this would navigate to detailed profile
  };

  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = volunteer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filter === 'all' || volunteer.specialties.includes(filter);
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#38a169';
      case 'busy': return '#d69e2e';
      case 'offline': return '#e53e3e';
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
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {volunteers.reduce((sum, v) => sum + v.requestsHelped, 0)}
            </div>
            <div style={{ color: '#4a5568' }}>Requests Helped</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
              {(volunteers.reduce((sum, v) => sum + v.rating, 0) / volunteers.length).toFixed(1)}
            </div>
            <div style={{ color: '#4a5568' }}>Avg Rating</div>
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
            <option value="all">All Specialties</option>
            <option value="Medical">Medical</option>
            <option value="Food & Water">Food & Water</option>
            <option value="Shelter">Shelter</option>
            <option value="Transport">Transport</option>
            <option value="Other">Other</option>
          </select>
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
            onClick={() => handleViewProfile(volunteer)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  marginRight: 16
                }}>
                  {volunteer.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: '#2d3748',
                    marginBottom: 4
                  }}>
                    {volunteer.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(volunteer.status)
                    }}></div>
                    <span style={{
                      fontSize: '0.9rem',
                      color: '#718096',
                      textTransform: 'capitalize'
                    }}>
                      {volunteer.status}
                    </span>
                  </div>
                </div>
                <div style={{
                  textAlign: 'right'
                }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: '#667eea'
                  }}>
                    ⭐ {volunteer.rating}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#718096'
                  }}>
                    {volunteer.requestsHelped} helped
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                marginBottom: 16
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Location</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>{volunteer.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Availability</div>
                  <div style={{ fontSize: '0.9rem', color: '#2d3748' }}>{volunteer.availability}</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 4 }}>Specialties</div>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap'
                }}>
                  {volunteer.specialties.map((specialty, index) => (
                    <span key={index} style={{
                      background: 'rgba(102, 126, 234, 0.1)',
                      color: '#667eea',
                      padding: '4px 8px',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      {specialty}
                    </span>
                  ))}
                </div>
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(volunteer);
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
                  View Profile
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