import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const SupportPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('emergency');

  const supportCategories = [
    {
      id: 'emergency',
      title: 'Emergency Support',
      icon: '🚨',
      description: 'Immediate assistance for life-threatening situations',
      contacts: [
        { name: 'Emergency Hotline', number: '911', available: '24/7', priority: 'Critical' },
        { name: 'Medical Emergency', number: '+1-555-EMERGENCY', available: '24/7', priority: 'Critical' },
        { name: 'Fire Department', number: '+1-555-FIRE', available: '24/7', priority: 'Critical' },
        { name: 'Police Department', number: '+1-555-POLICE', available: '24/7', priority: 'Critical' }
      ]
    },
    {
      id: 'medical',
      title: 'Medical Support',
      icon: '🏥',
      description: 'Healthcare assistance and medical guidance',
      contacts: [
        { name: 'Medical Hotline', number: '+1-555-MEDICAL', available: '24/7', priority: 'High' },
        { name: 'Poison Control', number: '+1-800-222-1222', available: '24/7', priority: 'Critical' },
        { name: 'Mental Health Crisis', number: '+1-800-273-8255', available: '24/7', priority: 'High' },
        { name: 'COVID-19 Hotline', number: '+1-555-COVID', available: '24/7', priority: 'Medium' }
      ]
    },
    {
      id: 'shelter',
      title: 'Shelter & Housing',
      icon: '🏠',
      description: 'Emergency housing and shelter assistance',
      contacts: [
        { name: 'Shelter Hotline', number: '+1-555-SHELTER', available: '24/7', priority: 'High' },
        { name: 'Homeless Support', number: '+1-555-HOME', available: '24/7', priority: 'High' },
        { name: 'Domestic Violence', number: '+1-800-799-7233', available: '24/7', priority: 'Critical' },
        { name: 'Youth Shelter', number: '+1-555-YOUTH', available: '24/7', priority: 'High' }
      ]
    },
    {
      id: 'food',
      title: 'Food & Basic Needs',
      icon: '🍽️',
      description: 'Food assistance and basic necessities',
      contacts: [
        { name: 'Food Bank Hotline', number: '+1-555-FOOD', available: '24/7', priority: 'Medium' },
        { name: 'Meal Programs', number: '+1-555-MEALS', available: '6AM-10PM', priority: 'Medium' },
        { name: 'Water Distribution', number: '+1-555-WATER', available: '24/7', priority: 'High' },
        { name: 'Baby Supplies', number: '+1-555-BABY', available: '8AM-8PM', priority: 'Medium' }
      ]
    },
    {
      id: 'transport',
      title: 'Transportation',
      icon: '🚗',
      description: 'Emergency transportation services',
      contacts: [
        { name: 'Emergency Transport', number: '+1-555-TRANSPORT', available: '24/7', priority: 'High' },
        { name: 'Medical Transport', number: '+1-555-MEDTRANS', available: '24/7', priority: 'High' },
        { name: 'Public Transit Info', number: '+1-555-TRANSIT', available: '5AM-1AM', priority: 'Low' },
        { name: 'Roadside Assistance', number: '+1-555-ROADSIDE', available: '24/7', priority: 'Medium' }
      ]
    },
    {
      id: 'general',
      title: 'General Support',
      icon: '📞',
      description: 'General information and non-emergency assistance',
      contacts: [
        { name: 'General Information', number: '+1-555-INFO', available: '24/7', priority: 'Low' },
        { name: 'Volunteer Coordination', number: '+1-555-VOLUNTEER', available: '8AM-8PM', priority: 'Medium' },
        { name: 'Donation Inquiries', number: '+1-555-DONATE', available: '9AM-6PM', priority: 'Low' },
        { name: 'Technical Support', number: '+1-555-TECH', available: '24/7', priority: 'Low' }
      ]
    }
  ];

  const handleCall = (contact) => {
    addNotification(`Calling ${contact.name}...`, 'info');
    // In real app, this would initiate a call
  };

  const handleChat = (contact) => {
    addNotification(`Opening chat with ${contact.name}...`, 'info');
    // In real app, this would open chat interface
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

  const selectedCategoryData = supportCategories.find(cat => cat.id === selectedCategory);

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 40
        }}>
          {supportCategories.map((category) => (
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
              <p style={{
                fontSize: '0.9rem',
                opacity: 0.8,
                lineHeight: 1.4
              }}>
                {category.description}
              </p>
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
                        {contact.number}
                      </div>
                    </div>
                    <span style={{
                      background: getPriorityColor(contact.priority),
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {contact.priority}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#718096', marginBottom: 2 }}>Available</div>
                      <div style={{ fontSize: '0.9rem', color: '#2d3748', fontWeight: '500' }}>
                        {contact.available}
                      </div>
                    </div>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: contact.available === '24/7' ? '#38a169' : '#d69e2e'
                    }}></div>
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
                    <button
                      onClick={() => handleChat(contact)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        color: '#667eea',
                        border: '2px solid #667eea',
                        borderRadius: 8,
                        padding: '10px 16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '0.9rem'
                      }}
                    >
                      💬 Chat
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