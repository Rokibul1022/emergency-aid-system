import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

// Mock donations data
const mockDonations = [
  {
    id: 1,
    title: 'Food Supplies',
    category: 'Food & Water',
    description: 'Canned goods, rice, and bottled water',
    quantity: '10 items',
    location: '123 Main St',
    donor: 'Alice',
    status: 'available',
    timestamp: Date.now() - 3600000,
    contact: '+1234567890',
  },
  {
    id: 2,
    title: 'Medical Supplies',
    category: 'Medical',
    description: 'First aid kit, bandages, pain relievers',
    quantity: '5 kits',
    location: '456 Oak Ave',
    donor: 'Bob',
    status: 'claimed',
    timestamp: Date.now() - 7200000,
    contact: '+1234567891',
    claimedBy: 'Carol',
  },
  {
    id: 3,
    title: 'Blankets and Clothing',
    category: 'Shelter',
    description: 'Warm blankets and winter clothing',
    quantity: '20 pieces',
    location: '789 Pine Rd',
    donor: 'David',
    status: 'available',
    timestamp: Date.now() - 1800000,
    contact: '+1234567892',
  },
];

const categories = ['All', 'Food & Water', 'Medical', 'Shelter', 'Transport', 'Other'];

const DonationBoardPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user } = useAuth();
  const [donations, setDonations] = useState(mockDonations);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newDonation, setNewDonation] = useState({
    title: '',
    category: '',
    description: '',
    quantity: '',
    location: '',
    contact: user?.phone || '',
  });

  const handlePostDonation = (e) => {
    e.preventDefault();
    const donation = {
      id: Date.now(),
      ...newDonation,
      donor: user?.name || 'Anonymous',
      status: 'available',
      timestamp: Date.now(),
    };
    setDonations(prev => [donation, ...prev]);
    setNewDonation({
      title: '',
      category: '',
      description: '',
      quantity: '',
      location: '',
      contact: user?.phone || '',
    });
    setShowPostForm(false);
    addNotification('Donation posted successfully!', 'success');
  };

  const handleClaimDonation = (id) => {
    setDonations(prev => prev.map(d => 
      d.id === id 
        ? { ...d, status: 'claimed', claimedBy: user?.name || 'Anonymous' }
        : d
    ));
    addNotification('Donation claimed successfully!', 'success');
  };

  const handleContact = (donation) => {
    addNotification(`Contact ${donation.donor} at ${donation.contact}`, 'info');
  };

  const filteredDonations = donations.filter(donation => {
    const matchesCategory = selectedCategory === 'All' || donation.category === selectedCategory;
    const matchesSearch = donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         donation.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatTime = (timestamp) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="page-container" style={{ background: '#f7f9fb', minHeight: '100vh', padding: '40px 0' }}>
      <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32 }}>{t('donations.title') || 'Donation Board'}</h1>
      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPostForm(!showPostForm)}
            style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }}
          >
            {showPostForm ? 'Cancel' : 'Post New Donation'}
          </button>
          <input
            type="text"
            placeholder="Search donations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, flex: 1, minWidth: 200 }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      {/* Post Donation Form */}
      {showPostForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Post New Donation</h2>
          <form onSubmit={handlePostDonation}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Title</label>
                <input
                  type="text"
                  value={newDonation.title}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, title: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Category</label>
                <select
                  value={newDonation.category}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, category: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  <option value="">Select category</option>
                  {categories.slice(1).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea
                  value={newDonation.description}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Quantity</label>
                <input
                  type="text"
                  value={newDonation.quantity}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, quantity: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Location</label>
                <input
                  type="text"
                  value={newDonation.location}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, location: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Contact</label>
                <input
                  type="text"
                  value={newDonation.contact}
                  onChange={(e) => setNewDonation(prev => ({ ...prev, contact: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginTop: 16, fontWeight: 600 }}
            >
              Post Donation
            </button>
          </form>
        </div>
      )}
      {/* Donations List */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
        <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Available Donations</h2>
        {filteredDonations.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>
            No donations found matching your criteria
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filteredDonations.map(donation => (
              <div
                key={donation.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: donation.status === 'claimed' ? '#f8f8f8' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ color: '#2d3748', margin: 0 }}>{donation.title}</h3>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {donation.category} • {donation.quantity} • {donation.location}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{formatTime(donation.timestamp)}</div>
                    <div style={{ 
                      fontSize: 10, 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      backgroundColor: donation.status === 'available' ? '#667eea' : '#666',
                      color: '#fff',
                      display: 'inline-block'
                    }}>
                      {donation.status}
                    </div>
                  </div>
                </div>
                <p style={{ margin: '8px 0', color: '#333' }}>{donation.description}</p>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  Donated by: {donation.donor}
                  {donation.status === 'claimed' && ` • Claimed by: ${donation.claimedBy}`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleContact(donation)}
                    style={{ background: '#fff', color: '#667eea', border: '1px solid #667eea', borderRadius: 4, padding: '4px 12px', fontSize: 12 }}
                  >
                    Contact
                  </button>
                  {donation.status === 'available' && (
                    <button
                      onClick={() => handleClaimDonation(donation.id)}
                      style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12 }}
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationBoardPage; 