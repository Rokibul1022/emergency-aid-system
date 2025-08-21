import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import donationService from '../firebase/mergedDonationService';

// Donation categories
const categories = ['All', 'Food & Water', 'Medical', 'Shelter', 'Transport', 'Other'];

// Template Method Pattern for Donation Matching
class DonationMatchTemplate {
  match(donation, asks) {
    const candidates = this.filterCandidates(donation, asks);
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    const scored = candidates.map((a) => ({
      ask: a,
      score: this.score(donation, a),
    }));

    const selected = this.select(scored);
    return selected ? selected.ask : null;
  }

  filterCandidates(_donation, _asks) {
    throw new Error('filterCandidates() must be implemented by subclass');
  }

  score(_donation, _ask) {
    return 1; // Default: equal score
  }

  select(scoredList) {
    const sorted = [...scoredList].sort((a, b) => b.score - a.score);
    return sorted[0] || null;
  }
}

class CategoryMatch extends DonationMatchTemplate {
  filterCandidates(donation, asks) {
    return asks.filter(
      (a) => a.status === 'pending' && a.category === donation.category
    );
  }
}

const DonationBoardPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user, userData } = useAuth();
  const effectiveRole = userData?.role || 'requester';

  const [donations, setDonations] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newDonation, setNewDonation] = useState({
    title: '',
    category: '',
    description: '',
    quantity: '',
    location: '',
    contact: userData?.phone || '',
    type: 'in-kind', // Added default type
  });
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time donations
  useEffect(() => {
    if (!user) return;

    const unsubscribe = donationService.subscribeToDonations((donationsData) => {
      setDonations(donationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePostDonation = async (e) => {
    e.preventDefault();
    const donationData = {
      title: newDonation.title,
      category: newDonation.category,
      description: newDonation.description,
      quantity: parseFloat(newDonation.quantity) || 1, // Parse quantity as number
      location: newDonation.location,
      contact: newDonation.contact,
      donorId: user.uid,
      donorName: userData?.displayName || 'Anonymous',
      status: 'available',
      timestamp: Date.now(),
      type: newDonation.type, // Added type field
    };

    try {
      const createdDonation = await donationService.createDonation(donationData);

      // Auto-match using Template Method
      const matcher = new CategoryMatch();
      const askedDonations = await donationService.getAllAskedDonations();
      const matchedAsk = matcher.match(createdDonation, askedDonations);
      if (matchedAsk) {
        await donationService.linkDonationToAsk(createdDonation.id, matchedAsk.id);
        createdDonation.status = 'matched';
        createdDonation.linkedAskId = matchedAsk.id;
      }

      setDonations((prev) => [createdDonation, ...prev]);
      setNewDonation({
        title: '',
        category: '',
        description: '',
        quantity: '',
        location: '',
        contact: userData?.phone || '',
        type: 'in-kind', // Reset type
      });
      setShowPostForm(false);
      addNotification('Donation posted successfully!', 'success');
    } catch (error) {
      console.error('Error posting donation:', error);
      addNotification(`Failed to post donation: ${error.message}`, 'error');
    }
  };

  const handleClaimDonation = async (id) => {
    try {
      await donationService.claimDonation(id, user.uid, userData?.displayName || 'Anonymous');
      setDonations((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, status: 'claimed', claimedBy: user.uid, claimedByName: userData?.displayName || 'Anonymous' } : d
        )
      );
      addNotification('Donation claimed successfully!', 'success');
    } catch (error) {
      console.error('Error claiming donation:', error);
      addNotification('Failed to claim donation', 'error');
    }
  };

  const handleContact = (donation) => {
    addNotification(`Contact ${donation.donorName} at ${donation.contact}`, 'info');
  };

  const filteredDonations = donations.filter((donation) => {
    const matchesCategory = selectedCategory === 'All' || donation.category === selectedCategory;
    const matchesSearch =
      donation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <h1 style={{ color: '#2d3748', textAlign: 'center', marginBottom: 32 }}>
        {t('donations.title') || 'Donation Board'}
      </h1>

      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {effectiveRole === 'volunteer' && (
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 600 }}
            >
              {showPostForm ? 'Cancel' : 'Post New Donation'}
            </button>
          )}
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
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Post Donation Form (only for volunteers) */}
      {showPostForm && effectiveRole === 'volunteer' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Post New Donation</h2>
          <form onSubmit={handlePostDonation}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Title</label>
                <input
                  type="text"
                  value={newDonation.title}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Category</label>
                <select
                  value={newDonation.category}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, category: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  <option value="">Select category</option>
                  {categories.slice(1).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea
                  value={newDonation.description}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  value={newDonation.quantity}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, quantity: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Location</label>
                <input
                  type="text"
                  value={newDonation.location}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, location: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Contact</label>
                <input
                  type="text"
                  value={newDonation.contact}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, contact: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Type</label>
                <select
                  value={newDonation.type}
                  onChange={(e) => setNewDonation((prev) => ({ ...prev, type: e.target.value }))}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  <option value="in-kind">In-Kind (Goods)</option>
                  <option value="monetary">Monetary</option>
                </select>
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
            <div>Loading donations...</div>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
            <div>No donations found</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filteredDonations.map((donation) => (
              <div
                key={donation.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor:
                    donation.status === 'claimed'
                      ? '#f8f8f8'
                      : donation.status === 'matched'
                      ? '#f6fff8'
                      : '#fff',
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
                    <div
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor:
                          donation.status === 'available'
                            ? '#667eea'
                            : donation.status === 'claimed'
                            ? '#666'
                            : '#0a9d56', // green for matched
                        color: '#fff',
                        display: 'inline-block',
                        textTransform: 'capitalize',
                      }}
                    >
                      {donation.status}
                    </div>
                  </div>
                </div>

                <p style={{ margin: '8px 0', color: '#333' }}>{donation.description}</p>

                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                  Donated by: {donation.donorName}
                  {donation.status === 'claimed' && ` • Claimed by: ${donation.claimedByName}`}
                  {donation.status === 'matched' && donation.linkedAskId && (
                    <span> • Matched to Ask #{donation.linkedAskId}</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleContact(donation)}
                    style={{ background: '#fff', color: '#667eea', border: '1px solid #667eea', borderRadius: 4, padding: '4px 12px', fontSize: 12 }}
                  >
                    Contact
                  </button>

                  {donation.status === 'available' && effectiveRole === 'requester' && (
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