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
import './DashboardPage.css';

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

  // Simple function to load Jack's data immediately
  const loadJacksData = async () => {
    try {
      console.log('Loading Jack\'s data immediately...');
      setLoading(true);
      
      // Ensure Jack has a phone number
      if (!userData?.phone) {
        console.log('Setting phone number for Jack...');
        await updateUser({ phone: '1234567890' });
      }
      
      // Create sample data for Jack
      const result = await createSampleData(user.uid, userData);
      if (result.success) {
        // Get Jack's requests
        const userRequests = await getRequestsByRequester(user.uid);
        
        // Calculate stats
        const pendingRequests = userRequests.filter(req => req.status === 'pending');
        const activeRequests = userRequests.filter(req => req.status === 'in-progress');
        const completedRequests = userRequests.filter(req => req.status === 'resolved');
        
        const newStats = {
          requests: userRequests.length,
          active: activeRequests.length,
          completed: completedRequests.length,
          pending: pendingRequests.length,
        };
        
        // Update dashboard
        setStats(newStats);
        setRecentRequests(userRequests.slice(0, 5));
        
        console.log('✅ Jack\'s data loaded successfully!', newStats);
      }
    } catch (error) {
      console.error('Error loading Jack\'s data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for user and userData to be loaded before fetching dashboard data
    if (!user || !user.uid || !userData) return;
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        console.log('=== DASHBOARD DATA LOADING START ===');
        console.log('User ID:', user?.uid);
        console.log('Role:', role || userData?.role);
        const effectiveRole = role || userData?.role || 'requester';
        if (effectiveRole === 'requester') {
          const { getOpenRequests } = await import('../firebase/requests');
          const allRequests = await getOpenRequests(500);
          const userRequests = allRequests.filter(req => req.requesterId === user.uid);
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
        } else if (effectiveRole === 'volunteer') {
          const assignedRequests = await getRequestsByVolunteer(user.uid);
          const { getOpenRequests } = await import('../firebase/requests');
          const allRequests = await getOpenRequests(100);
          const nearbyPendingRequests = allRequests.filter(req => req.status === 'pending');
          const userRequests = [...assignedRequests, ...nearbyPendingRequests];
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
        } else if (effectiveRole === 'admin') {
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
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [user, userData, role]);

  // Subscribe to real-time updates for recent requests
  useEffect(() => {
    if (!user || !user.uid) return;

    console.log('Setting up real-time subscription for user:', user.uid);
    
    let unsubscribe;
    
    // Subscribe to requests based on user role
    const effectiveRole = role || userData?.role || 'requester';
    console.log('Real-time subscription for role:', effectiveRole);
    
    if (effectiveRole === 'volunteer') {
      // For volunteers, subscribe to all requests (to see nearby and assigned)
      unsubscribe = subscribeToRequests((requests) => {
        console.log('Real-time update received for volunteer, total requests:', requests.length);
        
        // Get assigned requests
        const assignedRequests = requests.filter(req => req.assignedVolunteerId === user.uid);
        // Get pending requests (for nearby)
        const pendingRequests = requests.filter(req => req.status === 'pending');
        
        // Combine and remove duplicates
        const allVolunteerRequests = [...assignedRequests, ...pendingRequests];
        const uniqueRequests = [];
        const seenIds = new Set();
        allVolunteerRequests.forEach(req => {
          if (!seenIds.has(req.id)) {
            seenIds.add(req.id);
            uniqueRequests.push(req);
          }
        });
        
        console.log('Volunteer requests in real-time update:', uniqueRequests.length);
        
        setRecentRequests(uniqueRequests.slice(0, 5));
        
        // Update stats for volunteer
        const volunteerPending = uniqueRequests.filter(req => req.status === 'pending');
        const volunteerActive = uniqueRequests.filter(req => req.status === 'in-progress' && req.assignedVolunteerId === user.uid);
        const volunteerCompleted = uniqueRequests.filter(req => req.status === 'resolved' && req.assignedVolunteerId === user.uid);
        
        const newStats = {
          requests: uniqueRequests.length,
          active: volunteerActive.length,
          completed: volunteerCompleted.length,
          pending: volunteerPending.length,
        };
        
        console.log('Updating volunteer stats from real-time:', newStats);
        setStats(newStats);
      });
    } else if (effectiveRole === 'requester') {
      // For requesters, subscribe to their own requests
      unsubscribe = subscribeToRequests((requests) => {
        console.log('Real-time update received for requester, total requests:', requests.length);
        const userRequests = requests.filter(req => req.requesterId === user.uid);
        console.log('Requester requests in real-time update:', userRequests.length);
        
        setRecentRequests(userRequests.slice(0, 5));
        
        // Update stats
        const pendingRequests = userRequests.filter(req => req.status === 'pending');
        const activeRequests = userRequests.filter(req => req.status === 'in-progress');
        const completedRequests = userRequests.filter(req => req.status === 'resolved');
        
        const newStats = {
          requests: userRequests.length,
          active: activeRequests.length,
          completed: completedRequests.length,
          pending: pendingRequests.length,
        };
        
        console.log('Updating requester stats from real-time:', newStats);
        setStats(newStats);
      }, { requesterId: user.uid });
    } else if (effectiveRole === 'admin') {
      // For admins, subscribe to all requests
      unsubscribe = subscribeToRequests((requests) => {
        console.log('Real-time update received for admin, total requests:', requests.length);
        
        setRecentRequests(requests.slice(0, 5));
        
        // Update stats
        const pendingRequests = requests.filter(req => req.status === 'pending');
        const activeRequests = requests.filter(req => req.status === 'in-progress');
        const completedRequests = requests.filter(req => req.status === 'resolved');
        
        const newStats = {
          requests: requests.length,
          active: activeRequests.length,
          completed: completedRequests.length,
          pending: pendingRequests.length,
        };
        
        console.log('Updating admin stats from real-time:', newStats);
        setStats(newStats);
      });
    }

    return () => {
      if (unsubscribe) {
        console.log('Cleaning up real-time subscription');
        unsubscribe();
      }
    };
  }, [user, userData, role]);

  const getRoleBasedContent = () => {
    const displayName = userData?.displayName || user?.email?.split('@')[0] || 'User';
    
    // If role is not set, show requester content as fallback
    const effectiveRole = role || userData?.role || 'requester';
    
    // Force set role if not set (without reload)
    if (!role && !userData?.role && user) {
      console.log('No role found, forcing requester role');
      updateUser({ role: 'requester' }).catch(error => {
        console.error('Error setting role:', error);
      });
    }
    
    switch (effectiveRole) {
      case 'requester':
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
          recentActivity: recentRequests.length > 0 ? recentRequests.map(request => ({
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

      case 'volunteer':
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
          recentActivity: recentRequests.map(request => {
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

      case 'admin':
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
          recentActivity: recentRequests.map(request => ({
            type: 'request',
            message: `New ${request.category} request from ${request.contact?.name || 'Anonymous'}`,
            time: request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'
          })),
        };

      default:
        return {
          title: `${t('dashboard.welcome')}, ${displayName}`,
          subtitle: 'Welcome to the Emergency Aid System',
          quickActions: [],
          recentActivity: [],
        };
    }
  };

  const content = getRoleBasedContent();

  const handleLocationUpdate = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      // Do not show notification; just open the manual location popup
    }
  };

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('Manual refresh triggered');
      
      // Force reload dashboard data based on role
      const effectiveRole = role || userData?.role || 'requester';
      console.log('Manual refresh for role:', effectiveRole);
      
      let userRequests = [];
      
      if (effectiveRole === 'volunteer') {
        // For volunteers, get assigned and pending requests
        const { getOpenRequests, getRequestsByVolunteer } = await import('../firebase/requests');
        const allRequests = await getOpenRequests(100);
        const assignedRequests = await getRequestsByVolunteer(user.uid);
        const pendingRequests = allRequests.filter(req => req.status === 'pending');
        
        // Combine and remove duplicates
        userRequests = [...assignedRequests, ...pendingRequests];
        const uniqueRequests = [];
        const seenIds = new Set();
        userRequests.forEach(req => {
          if (!seenIds.has(req.id)) {
            seenIds.add(req.id);
            uniqueRequests.push(req);
          }
        });
        userRequests = uniqueRequests;
        
        console.log('Manual refresh - Volunteer requests loaded:', userRequests);
      } else if (effectiveRole === 'requester') {
        // For requesters, get their specific requests
        userRequests = await getRequestsByRequester(user.uid);
        console.log('Manual refresh - Requester requests loaded:', userRequests);
        
        // If no requests, create a test one
        if (userRequests.length === 0) {
          console.log('No requests found for requester, creating test request...');
          const { createRequest } = await import('../firebase/requests');
          const testRequest = {
            title: 'Test Request for Requester',
            description: 'This is a test request to verify requester dashboard functionality',
            category: 'medical',
            urgency: 'medium',
            status: 'pending',
            contact: {
              name: userData?.displayName || 'Test Requester',
              phone: userData?.phone || '1234567890',
              email: userData?.email || 'test@example.com'
            },
            location: {
              lat: 23.8103,
              lng: 90.4125
            },
            requesterId: user.uid,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await createRequest(testRequest);
          userRequests = await getRequestsByRequester(user.uid);
          console.log('Manual refresh - Requester requests after creating test:', userRequests);
        }
      } else if (effectiveRole === 'admin') {
        // For admins, get all requests
        const { getOpenRequests } = await import('../firebase/requests');
        const allRequestsForAdmin = await getOpenRequests(100);
        userRequests = allRequestsForAdmin;
        console.log('Manual refresh - Admin requests loaded:', userRequests);
      }
      
      // Calculate stats based on role
      let pendingRequests, activeRequests, completedRequests;
      
      if (effectiveRole === 'volunteer') {
        pendingRequests = userRequests.filter(req => req.status === 'pending');
        activeRequests = userRequests.filter(req => req.status === 'in-progress' && req.assignedVolunteerId === user.uid);
        completedRequests = userRequests.filter(req => req.status === 'resolved' && req.assignedVolunteerId === user.uid);
      } else {
        pendingRequests = userRequests.filter(req => req.status === 'pending');
        activeRequests = userRequests.filter(req => req.status === 'in-progress');
        completedRequests = userRequests.filter(req => req.status === 'resolved');
      }
      
      const newStats = {
        requests: userRequests.length,
        active: activeRequests.length,
        completed: completedRequests.length,
        pending: pendingRequests.length,
      };
      
      console.log('Manual refresh - Setting stats:', newStats);
      setStats(newStats);
      setRecentRequests(userRequests.slice(0, 5));
      
      // Show success message
      setTimeout(() => {
        alert(`Data refreshed successfully for ${effectiveRole}! Found ${userRequests.length} requests.`);
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
      // Ensure user has a phone number before creating panic alert
      let currentUserData = userData;
      if (!userData?.phone) {
        console.log('No phone number found, setting default phone...');
        await updateUser({ phone: '1234567890' });
        // Update local userData to reflect the change
        currentUserData = { ...userData, phone: '1234567890' };
      }
      
      let location = null;
      // Use currentLocation from context if available
      if (currentLocation && currentLocation.lat && currentLocation.lng) {
        location = currentLocation;
      } else if (currentUserData?.location && currentUserData.location.lat && currentUserData.location.lng) {
        location = currentUserData.location;
      } else if (!forceNoLocation) {
        try {
          console.log('Panic Alert: Getting current location...');
          location = await getCurrentLocation();
        } catch (locErr) {
          console.error('Panic Alert: Location error:', locErr);
          setPanicSending(false);
          setShowPanicNoLocation(true);
          return;
        }
      }
      
      const phoneNumber = currentUserData?.phone || '1234567890';
      console.log('Creating panic alert with phone:', phoneNumber, 'UserData phone:', currentUserData?.phone);
      
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
      if (typeof addNotification === 'function') {
        addNotification('Panic alert sent!', 'success');
      } else {
        alert('Panic alert sent!');
      }
    } catch (error) {
      console.error('Panic Alert: Failed to send alert:', error);
      setTimeout(() => setPanicSent(false), 4000);
      if (typeof addNotification === 'function') {
        addNotification('Failed to send panic alert', 'error');
      } else {
        alert('Failed to send panic alert: ' + error.message);
      }
    } finally {
      setPanicSending(false);
    }
  };

  const renderQuickActions = () => {
    const effectiveRole = role || userData?.role || 'requester';
    // Show quick actions for all roles
    return (
      <div className="quick-actions-grid">
        {content.quickActions.map((action, index) => (
          <Link key={index} to={action.link} className="quick-action-card">
            <div className="action-icon">{action.icon}</div>
            <div className="action-content">
              <h3 className="action-title">{action.title}</h3>
              <p className="action-description">{action.description}</p>
            </div>
          </Link>
        ))}
        {/* Panic Alert only for requester */}
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
      {/* Panic Confirmation Modal */}
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
      {/* Panic No Location Modal */}
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
            className="location-update-btn"
          >
            Update Location
          </button>
          {/* Manual Location Modal */}
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
                      style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: '16px' }}
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

      <div className="stats-grid">
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
            {content.recentActivity.length > 0 ? (
              content.recentActivity.map((activity, index) => (
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
    </div>
  );
};

export default DashboardPage; 