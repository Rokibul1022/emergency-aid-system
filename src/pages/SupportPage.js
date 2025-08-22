import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const SupportPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('admins');
  const [admins, setAdmins] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch admins from users collection
    const unsubscribeAdmins = onSnapshot(collection(db, 'users'), (querySnapshot) => {
      const adminsData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() || {};
        // Check for role or fallback to any user if role is unreliable
        if (data.role && (data.role.toLowerCase() === 'admin' || data.role.toLowerCase() === 'administrator')) {
          adminsData.push({
            id: doc.id,
            name: data.displayName || 'Unnamed Admin', // Using displayName as confirmed
            email: data.email || 'N/A',
            phone: data.phone || 'N/A'
          });
        }
      });
      setAdmins(adminsData);
    }, (error) => {
      console.error('Error fetching admins:', error);
      addNotification('Failed to load admins', 'error');
    });

    // Fetch volunteers from users collection
    const unsubscribeVolunteers = onSnapshot(collection(db, 'users'), (querySnapshot) => {
      const volunteersData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() || {};
        // Check for role or fallback to any user if role is unreliable
        if (data.role && (data.role.toLowerCase() === 'volunteer' || data.role.toLowerCase() === 'vol')) {
          volunteersData.push({
            id: doc.id,
            name: data.displayName || 'Unnamed Volunteer', // Using displayName as confirmed
            phone: data.phone || 'N/A',
            email: data.email || 'N/A'
          });
        }
      });
      setVolunteers(volunteersData);
    }, (error) => {
      console.error('Error fetching volunteers:', error);
      addNotification('Failed to load volunteers', 'error');
    });

    setLoading(false);

    return () => {
      unsubscribeAdmins();
      unsubscribeVolunteers();
    };
  }, []);

  const handleCall = (contact) => {
    addNotification(`Calling ${contact.name} at ${contact.phone}...`, 'info');
    // In real app, this would initiate a call
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return '#e53e3e';
      case 'High': return '#d69e2e';
      case 'Medium': return '#3182ce';
      case 'Low': return '#38a169';
      default: return '#718096';
    }
  };

  const contactCategories = [
    { id: 'admins', title: 'Admins', icon: '👨‍💼', contacts: admins, priority: 'High' },
    { id: 'volunteers', title: 'Volunteers', icon: '🤝', contacts: volunteers, priority: 'Medium' },
    { id: 'police', title: 'Police', icon: '👮', contacts: [{ name: 'Police Department', phone: '911', email: 'police@support.com', priority: 'Critical' }], priority: 'Critical' },
    { id: 'hospital', title: 'Hospital', icon: '🏥', contacts: [{ name: 'Emergency Hospital', phone: '+1-555-HOSPITAL', email: 'hospital@support.com', priority: 'Critical' }], priority: 'Critical' }
  ];

  const selectedCategoryData = contactCategories.find(cat => cat.id === selectedCategory);

  if (loading) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: '#fff', fontSize: '1.2rem' }}>Loading support contacts...</div>
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
          24/7 Support Available
        </h1>

        <p style={{
          textAlign: 'center',
          fontSize: '1.1rem',
          color: '#4a5568',
          marginBottom: 40,
          maxWidth: '600px',
          margin: '0 auto 40px auto'
        }}>
          Round-the-clock support services to help you in any emergency situation. 
          Choose a category below to find the appropriate contact information.
        </p>

        {/* Category Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)', // 2x2 grid for 4 categories
          gap: 16,
          marginBottom: 40
        }}>
          {contactCategories.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                background: selectedCategory === category.id 
                  ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                  : '#fff',
                color: selectedCategory === category.id ? '#fff' : '#2d3748',
                padding: '20px',
                borderRadius: 12,
                border: '2px solid',
                borderColor: selectedCategory === category.id ? 'transparent' : '#e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{category.icon}</div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                marginBottom: 8
              }}>
                {category.title}
              </h3>
            </div>
          ))}
        </div>

        {/* Contact Information */}
        {selectedCategoryData && (
          <div>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '600',
              color: '#2d3748',
              marginBottom: 24,
              textAlign: 'center'
            }}>
              {selectedCategoryData.icon} {selectedCategoryData.title}
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 20
            }}>
              {selectedCategoryData.contacts.map((contact, index) => (
                <div key={index} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#2d3748',
                        marginBottom: 4
                      }}>
                        {contact.name}
                      </h3>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: '#667eea',
                        marginBottom: 8
                      }}>
                        {contact.phone}
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#718096',
                        marginBottom: 8
                      }}>
                        {contact.email}
                      </div>
                    </div>
                    <span style={{
                      background: getPriorityColor(selectedCategoryData.priority),
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {selectedCategoryData.priority}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 12
                  }}>
                    <button
                      onClick={() => handleCall(contact)}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '0.9rem'
                      }}
                    >
                      📞 Call Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Notice */}
        <div style={{
          background: 'rgba(229, 62, 62, 0.1)',
          border: '2px solid #e53e3e',
          borderRadius: 12,
          padding: 24,
          marginTop: 40,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>🚨</div>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#e53e3e',
            marginBottom: 8
          }}>
            Emergency Notice
          </h3>
          <p style={{
            fontSize: '1rem',
            color: '#2d3748',
            lineHeight: 1.5
          }}>
            If you are experiencing a life-threatening emergency, call <strong>911</strong> immediately. 
            This platform is designed to supplement, not replace, emergency services.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;