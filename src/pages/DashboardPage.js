import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { 
  getRequestsByRequester, 
  getRequestsByVolunteer, 
  subscribeToRequests,
  createSampleData,
} from '../firebase/requests';
import { createPanicAlert } from '../firebase/alerts';
import donationService from '../firebase/mergedDonationService';
import './DashboardPage.css';


// Strategy Pattern: Define interface for data loading strategy
class DashboardDataStrategy {
  async loadData(user, setStats, setRecentRequests, setAskedDonations) {}
  subscribeToRealTimeUpdates(user, setStats, setRecentRequests, setAskedDonations) {}
}


class RequesterDataStrategy extends DashboardDataStrategy {
  async loadData(user, setStats, setRecentRequests, setAskedDonations) {
    const userRequests = await getRequestsByRequester(user.uid);
    const userAskedDonations = await donationService.getAskedDonationsByRequester(user.uid);
    
    const pendingRequests = userRequests.filter(req => req.status === 'pending');
    const activeRequests = userRequests.filter(req => req.status === 'in-progress');
    const completedRequests = userRequests.filter(req => req.status === 'resolved');
    
    const newStats = {
      requests: userRequests.length,
      active: activeRequests.length,
      completed: completedRequests.length,
      pending: pendingRequests.length,
    };
    
    setStats(newStats);
    setRecentRequests(userRequests.slice(0, 5));
    setAskedDonations(userAskedDonations);
  }


  subscribeToRealTimeUpdates(user, setStats, setRecentRequests, setAskedDonations) {
    const unsubscribeRequests = subscribeToRequests((requests) => {
      const userRequests = requests.filter(req => req.requesterId === user.uid);
      
      setRecentRequests(userRequests.slice(0, 5));
      
      const pendingRequests = userRequests.filter(req => req.status === 'pending');
      const activeRequests = userRequests.filter(req => req.status === 'in-progress');
      const completedRequests = userRequests.filter(req => req.status === 'resolved');
      
      const newStats = {
        requests: userRequests.length,
        active: activeRequests.length,
        completed: completedRequests.length,
        pending: pendingRequests.length,
      };
      
      setStats(newStats);
    }, { requesterId: user.uid });


    const unsubscribeDonations = donationService.subscribeToAskedDonations((askedDonationsData) => {
      const userAskedDonations = askedDonationsData.filter(ask => ask.requesterId === user.uid);
      setAskedDonations(userAskedDonations);
    }, { requesterId: user.uid });


    return () => {
      unsubscribeRequests();
      unsubscribeDonations();
    };
  }
}


class VolunteerDataStrategy extends DashboardDataStrategy {
  async loadData(user, setStats, setRecentRequests, setAskedDonations) {
    const { getOpenRequests } = await import('../firebase/requests');
    const assignedRequests = await getRequestsByVolunteer(user.uid);
    const allRequests = await getOpenRequests(100);
    const nearbyPendingRequests = allRequests.filter(req => req.status === 'pending');
    
    const userRequests = [...assignedRequests, ...nearbyPendingRequests];
    const uniqueRequests = [...new Set(userRequests.map(req => req.id))].map(id => 
      userRequests.find(req => req.id === id)
    );
    
    const pendingRequests = uniqueRequests.filter(req => req.status === 'pending');
    const activeRequests = uniqueRequests.filter(req => req.status === 'in-progress' && req.assignedVolunteerId === user.uid);
    const completedRequests = uniqueRequests.filter(req => req.status === 'resolved' && req.assignedVolunteerId === user.uid);
    
    const newStats = {
      requests: uniqueRequests.length,
      active: activeRequests.length,
      completed: completedRequests.length,
      pending: pendingRequests.length,
    };
    
    setStats(newStats);
    setRecentRequests(uniqueRequests.slice(0, 5));
    setAskedDonations([]);
  }


  subscribeToRealTimeUpdates(user, setStats, setRecentRequests, setAskedDonations) {
    return subscribeToRequests((requests) => {
      const assignedRequests = requests.filter(req => req.assignedVolunteerId === user.uid);
      const pendingRequests = requests.filter(req => req.status === 'pending');
      
      const allVolunteerRequests = [...assignedRequests, ...pendingRequests];
      const uniqueRequests = [...new Set(allVolunteerRequests.map(req => req.id))].map(id => 
        allVolunteerRequests.find(req => req.id === id)
      );
      
      setRecentRequests(uniqueRequests.slice(0, 5));
      
      const volunteerPending = uniqueRequests.filter(req => req.status === 'pending');
      const volunteerActive = uniqueRequests.filter(req => req.status === 'in-progress' && req.assignedVolunteerId === user.uid);
      const volunteerCompleted = uniqueRequests.filter(req => req.status === 'resolved' && req.assignedVolunteerId === user.uid);
      
      const newStats = {
        requests: uniqueRequests.length,
        active: volunteerActive.length,
        completed: volunteerCompleted.length,
        pending: volunteerPending.length,
      };
      
      setStats(newStats);
      setAskedDonations([]);
    });
  }
}


class AdminDataStrategy extends DashboardDataStrategy {
  async loadData(user, setStats, setRecentRequests, setAskedDonations) {
    const { getOpenRequests } = await import('../firebase/requests');
    const userRequests = await getOpenRequests(100);
    
    const pendingRequests = userRequests.filter(req => req.status === 'pending');
    const activeRequests = userRequests.filter(req => req.status === 'in-progress');
    const completedRequests = userRequests.filter(req => req.status === 'resolved');
    
    const newStats = {
      requests: userRequests.length,
      active: activeRequests.length,
      completed: completedRequests.length,
      pending: pendingRequests.length,
    };
    
    setStats(newStats);
    setRecentRequests(userRequests.slice(0, 5));
    setAskedDonations([]);
  }


  subscribeToRealTimeUpdates(user, setStats, setRecentRequests, setAskedDonations) {
    return subscribeToRequests((requests) => {
      setRecentRequests(requests.slice(0, 5));
      
      const pendingRequests = requests.filter(req => req.status === 'pending');
      const activeRequests = requests.filter(req => req.status === 'in-progress');
      const completedRequests = requests.filter(req => req.status === 'resolved');
      
      const newStats = {
        requests: requests.length,
        active: activeRequests.length,
        completed: completedRequests.length,
        pending: pendingRequests.length,
      };
      
      setStats(newStats);
      setAskedDonations([]);
    });
  }
}


// Factory Method Pattern: Define factory for creating role-based content
class DashboardContent {
  getContent(userData, user, t, setShowAskDonationForm) {}
}


class RequesterDashboardContent extends DashboardContent {
  getContent(userData, user, t, setShowAskDonationForm) {
    const displayName = userData?.displayName || user?.email?.split('@')[0] || 'User';
    return {
      title: `${t('dashboard.welcome')}, ${displayName}`,
      subtitle: 'Track your emergency requests and get help when you need it',
      quickActions: [
        {
          title: 'Submit New Request',
          description: 'Create an emergency assistance request',
          icon: '📝',
          link: '/request',
          color: 'primary',
        },
        {
          title: 'Ask for Donation',
          description: 'Request donations from volunteers',
          icon: '💰',
          onClick: () => setShowAskDonationForm(true),
          color: 'secondary',
        },
        {
          title: 'View Available Donations',
          description: 'See donations from volunteers',
          icon: '🎁',
          link: '/donations',
          color: 'info',
        },
        {
          title: 'View My Requests',
          description: 'Check the status of your requests',
          icon: '📊',
          link: '/my-requests',
          color: 'secondary',
        },
        {
          title: 'Find Shelters',
          description: 'Locate nearby emergency shelters',
          icon: '🏠',
          link: '/shelters',
          color: 'info',
        },
      ],
      recentActivity: (recentRequests) => recentRequests.length > 0 ? recentRequests.map(request => ({
        type: request.status === 'resolved' ? 'completed' : request.status === 'in-progress' ? 'update' : 'request',
        message: `${request.title} - ${request.category} request ${request.status === 'resolved' ? 'completed' : request.status === 'in-progress' ? 'in progress' : 'submitted'}`,
        time: request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'
      })) : [
        {
          type: 'system',
          message: 'No requests found. Click "Create Sample Data" to get started!',
          time: 'Now'
        }
      ],
    };
  }
}


class VolunteerDashboardContent extends DashboardContent {
  getContent(userData, user, t, setShowAskDonationForm) {
    const displayName = userData?.displayName || user?.email?.split('@')[0] || 'User';
    return {
      title: `${t('dashboard.welcome')}, ${displayName}`,
      subtitle: 'Help those in need by responding to emergency requests',
      quickActions: [
        {
          title: 'View Nearby Requests',
          description: 'See emergency requests in your area',
          icon: '🤝',
          link: '/volunteer',
          color: 'primary',
        },
        {
          title: 'Post Donation',
          description: 'Post new donations for requesters',
          icon: '💰',
          link: '/donations',
          color: 'secondary',
        },
        {
          title: 'My Active Requests',
          description: 'Manage your accepted requests',
          icon: '📋',
          link: '/volunteer',
          color: 'secondary',
        },
        {
          title: 'Emergency Resources',
          description: 'Access first aid and survival guides',
          icon: '📚',
          link: '/resources',
          color: 'info',
        },
      ],
      recentActivity: (recentRequests) => recentRequests.map(request => {
        const isAssigned = request.assignedVolunteerId === user?.uid;
        const isPending = request.status === 'pending';
        
        if (isAssigned && request.status === 'resolved') {
          return {
            type: 'complete',
            message: `Completed ${request.category} request`,
            time: request.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'
          };
        } else if (isAssigned && request.status === 'in-progress') {
          return {
            type: 'accept',
            message: `Accepted ${request.category} request`,
            time: request.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'
          };
        } else if (isPending) {
          return {
            type: 'request',
            message: `New ${request.category} request available`,
            time: request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'
          };
        } else {
          return {
            type: 'request',
            message: `${request.category} request ${request.status}`,
            time: request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'
          };
        }
      }),
    };
  }
}


class AdminDashboardContent extends DashboardContent {
  getContent(userData, user, t, setShowAskDonationForm) {
    const displayName = userData?.displayName || user?.email?.split('@')[0] || 'User';
    return {
      title: `${t('dashboard.welcome')}, ${displayName}`,
      subtitle: 'Manage the emergency aid system and oversee operations',
      quickActions: [
        {
          title: 'User Management',
          description: 'Manage users and their roles',
          icon: '👥',
          link: '/admin',
          color: 'primary',
        },
        {
          title: 'System Overview',
          description: 'View system statistics and analytics',
          icon: '📊',
          link: '/admin',
          color: 'secondary',
        },
        {
          title: 'Emergency Resources',
          description: 'Manage emergency resources and guides',
          icon: '📚',
          link: '/resources',
          color: 'info',
        },
      ],
      recentActivity: (recentRequests) => recentRequests.map(request => ({
        type: 'request',
        message: `New ${request.category} request from ${request.contact?.name || 'Anonymous'}`,
        time: request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'
      })),
    };
  }
}


// Factory for creating dashboard content
class DashboardContentFactory {
  static createDashboardContent(role) {
    switch (role) {
      case 'requester':
        return new RequesterDashboardContent();
      case 'volunteer':
        return new VolunteerDashboardContent();
      case 'admin':
        return new AdminDashboardContent();
      default:
        return new RequesterDashboardContent();
    }
  }
}


const DashboardPage = () => {
  const { t } = useTranslation();
  const { user, userData, role, updateUser } = useAuth();
  const { addNotification, getCurrentLocation, currentLocation, manualLocationPrompt, setManualLocationPrompt, manualLat, setManualLat, manualLng, setManualLng, setManualLocation } = useApp();
  const [stats, setStats] = useState({
    requests: 0,
    active: 0,
    completed: 0,
    pending: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [panicSending, setPanicSending] = useState(false);
  const [panicSent, setPanicSent] = useState(false);
  const [showPanicNoLocation, setShowPanicNoLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [askedDonations, setAskedDonations] = useState([]);
  const [showAskDonationForm, setShowAskDonationForm] = useState(false);
  const [newAskedDonation, setNewAskedDonation] = useState({
    title: '',
    category: '',
    description: '',
    quantity: '',
  });
  const categories = ['food', 'clothing', 'medical', 'shelter'];


  const loadJacksData = async () => {
    try {
      setLoading(true);
      if (!userData?.phone) {
        await updateUser({ phone: '1234567890' });
      }
      const result = await createSampleData(user.uid, userData);
      if (result.success) {
        const userRequests = await getRequestsByRequester(user.uid);
        const pendingRequests = userRequests.filter(req => req.status === 'pending');
        const activeRequests = userRequests.filter(req => req.status === 'in-progress');
        const completedRequests = userRequests.filter(req => req.status === 'resolved');
        
        const newStats = {
          requests: userRequests.length,
          active: activeRequests.length,
          completed: completedRequests.length,
          pending: pendingRequests.length,
        };
        
        setStats(newStats);
        setRecentRequests(userRequests.slice(0, 5));
        setAskedDonations([]);
      }
    } catch (error) {
      console.error('Error loading Jack\'s data:', error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!user || !user.uid || !userData) return;
    
    const effectiveRole = role || userData?.role || 'requester';
    if (!role && !userData?.role) {
      updateUser({ role: 'requester' }).catch(error => {
        console.error('Error setting role:', error);
      });
    }


    const strategy = {
      requester: new RequesterDataStrategy(),
      volunteer: new VolunteerDataStrategy(),
      admin: new AdminDataStrategy(),
    }[effectiveRole] || new RequesterDataStrategy();


    const loadData = async () => {
      try {
        setLoading(true);
        await strategy.loadData(user, setStats, setRecentRequests, setAskedDonations);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };


    loadData();
  }, [user, userData, role]);


  useEffect(() => {
    if (!user || !user.uid) return;
    
    const effectiveRole = role || userData?.role || 'requester';
    const strategy = {
      requester: new RequesterDataStrategy(),
      volunteer: new VolunteerDataStrategy(),
      admin: new AdminDataStrategy(),
    }[effectiveRole] || new RequesterDataStrategy();


    const unsubscribe = strategy.subscribeToRealTimeUpdates(user, setStats, setRecentRequests, setAskedDonations);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userData, role]);


  const dashboardContent = DashboardContentFactory.createDashboardContent(
    role || userData?.role || 'requester'
  );
  const content = dashboardContent.getContent(userData, user, t, setShowAskDonationForm);


  const handleLocationUpdate = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {}
  };


  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      const effectiveRole = role || userData?.role || 'requester';
      const strategy = {
        requester: new RequesterDataStrategy(),
        volunteer: new VolunteerDataStrategy(),
        admin: new AdminDataStrategy(),
      }[effectiveRole] || new RequesterDataStrategy();
      
      await strategy.loadData(user, setStats, setRecentRequests, setAskedDonations);
      
      setTimeout(() => {
        alert(`Data refreshed successfully for ${effectiveRole}! Found ${recentRequests.length} requests.`);
      }, 500);
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Refresh failed: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };


  const handleSendPanicAlert = async (forceNoLocation = false) => {
    setPanicSending(true);
    setShowPanicConfirm(false);
    try {
      let currentUserData = userData;
      if (!userData?.phone) {
        await updateUser({ phone: '1234567890' });
        currentUserData = { ...userData, phone: '1234567890' };
      }
      
      let location = null;
      if (currentLocation && currentLocation.lat && currentLocation.lng) {
        location = currentLocation;
      } else if (currentUserData?.location && currentUserData.location.lat && currentUserData.location.lng) {
        location = currentUserData.location;
      } else if (!forceNoLocation) {
        try {
          location = await getCurrentLocation();
        } catch (locErr) {
          setPanicSending(false);
          setShowPanicNoLocation(true);
          return;
        }
      }
      
      const phoneNumber = currentUserData?.phone || '1234567890';
      
      await createPanicAlert({
        userId: user.uid,
        displayName: currentUserData?.displayName || user.email || 'User',
        email: user.email || '',
        phone: phoneNumber,
        location: location ? {
          lat: location?.lat,
          lng: location?.lng,
          accuracy: location?.accuracy,
          address: location?.address,
          timestamp: location?.timestamp || Date.now()
        } : null
      });
      setPanicSent(true);
      setTimeout(() => setPanicSent(false), 4000);
      addNotification('Panic alert sent!', 'success');
    } catch (error) {
      console.error('Panic Alert: Failed to send alert:', error);
      setTimeout(() => setPanicSent(false), 4000);
      addNotification('Failed to send panic alert', 'error');
    } finally {
      setPanicSending(false);
    }
  };


  const handleAskDonationSubmit = async (e) => {
    e.preventDefault();
    if (!newAskedDonation.title || !newAskedDonation.category || !newAskedDonation.description) {
      addNotification('Please fill in all required fields', 'error');
      return;
    }


    try {
      const askedDonationData = {
        title: newAskedDonation.title,
        category: newAskedDonation.category,
        description: newAskedDonation.description,
        quantity: parseFloat(newAskedDonation.quantity) || 1,
        requesterId: user.uid,
        requesterName: userData?.displayName || 'Anonymous',
        requesterPhone: userData?.phone || '',
        status: donationService.DONATION_STATUS.PENDING,
      };


      const createdAsk = await donationService.createAskedDonation(askedDonationData);
      setAskedDonations((prev) => [createdAsk, ...prev]);
      setNewAskedDonation({
        title: '',
        category: '',
        description: '',
        quantity: '',
      });
      setShowAskDonationForm(false);
      addNotification('Donation request submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting donation request:', error);
      addNotification('Failed to submit donation request', 'error');
    }
  };


  const renderQuickActions = () => {
    const effectiveRole = role || userData?.role || 'requester';
    return (
      <div className="quick-actions-grid">
        {content.quickActions.map((action, index) => (
          <Link key={index} to={action.link || '#'} className="quick-action-card" onClick={action.onClick}>
            <div className="action-icon">{action.icon}</div>
            <div className="action-content">
              <h3 className="action-title">{action.title}</h3>
              <p className="action-description">{action.description}</p>
            </div>
          </Link>
        ))}
        {effectiveRole === 'requester' && (
          <div className="quick-action-card primary" style={{ borderLeft: '4px solid #e53e3e' }}>
            <span className="action-icon" style={{ fontSize: 32 }}>🚨</span>
            <div className="action-content">
              <h3 style={{ color: '#e53e3e' }}>Panic Alert</h3>
              <p>Send an instant emergency alert to volunteers and admins</p>
              <button
                className="btn btn-danger"
                style={{ marginTop: 8 }}
                onClick={() => setShowPanicConfirm(true)}
                disabled={panicSending}
              >
                {panicSending ? (
                  <>
                    <span className="spinner" style={{ marginRight: 8, border: '2px solid #fff', borderTop: '2px solid #e53e3e', borderRadius: '50%', width: 16, height: 16, display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                    Sending...
                  </>
                ) : 'Send Panic Alert'}
              </button>
              {panicSent && (
                <div style={{ color: '#38a169', marginTop: 8, fontWeight: 600 }}>
                  ✅ Panic alert sent!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f7f9fb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>🔄</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Loading dashboard...</div>
          <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
            Fetching data for {role || userData?.role || 'user'}...
          </div>
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }


  return (
    <div className="dashboard-container">
      {showPanicConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 320,
            maxWidth: '90vw',
            textAlign: 'center',
            animation: 'popIn 0.2s',
          }}>
            <h2 style={{ marginBottom: 16 }}>Confirm Panic Alert</h2>
            <p style={{ marginBottom: 24 }}>Are you sure you want to send a panic alert? Your location will be shared with volunteers and admins.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={() => handleSendPanicAlert(false)} disabled={panicSending}>
                {panicSending ? (
                  <span className="spinner" style={{ marginRight: 8, border: '2px solid #fff', borderTop: '2px solid #e53e3e', borderRadius: '50%', width: 16, height: 16, display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                ) : null}
                Yes, Send Alert
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPanicConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes popIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      {showPanicNoLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 32,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 320,
            maxWidth: '90vw',
            textAlign: 'center',
            animation: 'popIn 0.2s',
          }}>
            <h2 style={{ marginBottom: 16, color: '#e53e3e' }}>Location Unavailable</h2>
            <p style={{ marginBottom: 24 }}>We could not access your location. Please enable location services and try again, or send the alert without location.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="btn btn-danger" onClick={() => { setShowPanicNoLocation(false); handleSendPanicAlert(true); }} disabled={panicSending}>
                Send Anyway
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPanicNoLocation(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="dashboard-title">{content.title}</h1>
          <p className="dashboard-subtitle">{content.subtitle}</p>
        </div>
        <div className="location-section">
          <div className="location-info">
            <span className="location-icon">📍</span>
            <span className="location-text">
              {currentLocation 
                ? (currentLocation.address ? `${currentLocation.address} (${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)})` : `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`)
                : 'Location not available'
              }
            </span>
          </div>
          <button 
            onClick={handleLocationUpdate}
            className="location-update-btn btn mt-2"
          >
            Update Location
          </button>
          {manualLocationPrompt && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.35)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.2s',
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                minWidth: 320,
                maxWidth: '90vw',
                textAlign: 'center',
                animation: 'popIn 0.2s',
              }}>
                <h2 style={{ marginBottom: 16 }}>Enter Your Location</h2>
                <p style={{ marginBottom: 16 }}>We could not access your location automatically. Please enter your address <b>or</b> latitude and longitude manually.</p>
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={e => setManualAddress(e.target.value)}
                    placeholder="Enter your address (e.g. 123 Main St, City, Country)"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px', marginBottom: 8 }}
                  />
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Or enter coordinates below:</div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    <input
                      type="number"
                      value={manualLat}
                      onChange={e => setManualLat(e.target.value)}
                      placeholder="Latitude (e.g. 23.8103)"
                      step="any"
                      style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
                    />
                    <input
                      type="number"
                      value={manualLng}
                      onChange={e => setManualLng(e.target.value)}
                      placeholder="Longitude (e.g. 90.4125)"
                      step="any"
                      style={{ flex: 1, padding: '12px 12px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    disabled={isGeocoding}
                    onClick={async () => {
                      setIsGeocoding(true);
                      let ok = false;
                      if (manualAddress && (!manualLat || !manualLng)) {
                        ok = await setManualLocation('', '', manualAddress);
                      } else {
                        ok = await setManualLocation(manualLat, manualLng, manualAddress);
                      }
                      setIsGeocoding(false);
                      if (ok) setManualAddress('');
                    }}
                  >
                    {isGeocoding ? (
                      <span className="spinner" style={{ marginRight: 8, border: '2px solid #fff', borderTop: '2px solid #3182ce', borderRadius: '50%', width: 16, height: 16, display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                    ) : null}
                    Save Location
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setManualLocationPrompt(false); setManualAddress(''); }}
                    disabled={isGeocoding}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes popIn {
                  from { transform: scale(0.95); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
                .spinner {
                  border: 2px solid #e2e8f0;
                  border-top: 2px solid #3182ce;
                  border-radius: 50%;
                  width: 16px;
                  height: 16px;
                  display: inline-block;
                  animation: spin 1s linear infinite;
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
      <div className="stats-grid mb-4">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.requests}</h3>
            <p className="stat-label">Total Requests</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.active}</h3>
            <p className="stat-label">Active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.completed}</h3>
            <p className="stat-label">Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.pending}</h3>
            <p className="stat-label">Pending</p>
          </div>
        </div>
      </div>
      <div className="dashboard-content">
        <div className="quick-actions-section">
          <h2 className="section-title">Quick Actions</h2>
          {renderQuickActions()}
        </div>
        <div className="recent-activity-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {content.recentActivity(recentRequests).length > 0 ? (
              content.recentActivity(recentRequests).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'request' && '📝'}
                    {activity.type === 'update' && '🔄'}
                    {activity.type === 'completed' && '✅'}
                    {activity.type === 'accept' && '🤝'}
                    {activity.type === 'complete' && '✅'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAskDonationForm && (role || userData?.role) === 'requester' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px #e2e8f0' }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>Ask for Donation</h2>
          <form onSubmit={handleAskDonationSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Title</label>
                <input
                  type="text"
                  value={newAskedDonation.title}
                  onChange={(e) => setNewAskedDonation((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Category</label>
                <select
                  value={newAskedDonation.category}
                  onChange={(e) => setNewAskedDonation((prev) => ({ ...prev, category: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea
                  value={newAskedDonation.description}
                  onChange={(e) => setNewAskedDonation((prev) => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  value={newAskedDonation.quantity}
                  onChange={(e) => setNewAskedDonation((prev) => ({ ...prev, quantity: e.target.value }))}
                  required
                  style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                />
              </div>
            </div>
            <button
              type="submit"
              style={{ background: '#667eea', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', marginTop: 16, fontWeight: 600 }}
            >
              Submit Ask
            </button>
          </form>
        </div>
      )}
      {(role || userData?.role) === 'requester' && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ color: '#2d3748', marginBottom: 16 }}>My Asked Donations</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {askedDonations.map((ask) => (
              <div key={ask.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                <h3 style={{ color: '#2d3748', margin: 0 }}>{ask.title}</h3>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {ask.category} • {ask.quantity}
                </div>
                <p style={{ margin: '8px 0', color: '#333' }}>{ask.description}</p>
                <span style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 12,
                  backgroundColor: ask.status === 'pending' ? '#d69e2e' : ask.status === 'matched' ? '#38a169' : '#e53e3e',
                  color: '#fff',
                  textTransform: 'capitalize',
                }}>
                  {ask.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export default DashboardPage;



