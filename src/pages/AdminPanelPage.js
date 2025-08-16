  // Dashboard tab content renderer
  const renderDashboard = (stats) => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>System Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>{stats.totalUsers}</div>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>Total Users</div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>{stats.activeUsers}</div>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>Active Users</div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>{stats.totalRequests}</div>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>Total Requests</div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>{stats.pendingRequests}</div>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>Pending Requests</div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>{stats.totalShelters}</div>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>Total Shelters</div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>{stats.availableSpots}</div>
          <div style={{ color: '#718096', fontSize: '0.9rem' }}>Available Spots</div>
        </div>
      </div>
      {/* You can add more dashboard widgets or charts here as needed */}
    </div>
  );

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllUsers, 
  updateUserRole, 
  getUsersByRole,
  USER_ROLES 
} from '../firebase/auth';
import { 
  getRequestsByStatus, 
  updateRequestStatus, 
  deleteRequest,
  subscribeToRequests,
  REQUEST_STATUS,
  REQUEST_CATEGORIES,
  assignVolunteerToRequest
} from '../firebase/requests';
import { 
  getAllShelters, 
  createShelter, 
  updateShelter, 
  deleteShelter 
} from '../firebase/shelters';
import { subscribeToActivePanicAlerts } from '../firebase/alerts';
import RequestLocationMap from '../components/common/RequestLocationMap';
import RequestsMap from '../components/RequestsMap';

// Helper: Get icon for request category
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

// Helper: Get color for urgency
const getUrgencyColor = (urgency) => {
  switch (urgency) {
    case 'critical': return '#e53e3e';
    case 'high': return '#dd6b20';
    case 'medium': return '#d69e2e';
    case 'low': return '#38a169';
    default: return '#718096';
  }
};

// Helper: Get color for status
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#d69e2e';
    case 'in-progress': return '#3182ce';
    case 'resolved': return '#38a169';
    case 'cancelled': return '#e53e3e';
    default: return '#718096';
  }
};

// Helper: Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return 'Recently';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

// Handler: Mark panic alert as resolved
const handleResolvePanicAlert = async (alertId) => {
  try {
    // You may need to import/update this logic to match your Firestore structure
    // Example: await updateDoc(doc(db, 'panic_alerts', alertId), { resolved: true, resolvedAt: new Date() });
    // For now, just show a notification
    alert('Panic alert marked as resolved! (Implement Firestore update logic)');
  } catch (error) {
    alert('Failed to resolve alert');
  }
};

const AdminPanelPage = () => {
  const { t } = useTranslation();
  const { addNotification } = useApp();
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    totalShelters: 0,
    availableSpots: 0,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [panicAlerts, setPanicAlerts] = useState([]);

  // Shelter modal state (must be inside component)
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null);
  const [shelterForm, setShelterForm] = useState({
    name: '',
    capacity: '',
    contact: '',
    description: '',
    status: 'open',
    location: { lat: '', lng: '' },
  });

  const openAddShelter = () => {
    setEditingShelter(null);
    setShelterForm({ name: '', capacity: '', contact: '', description: '', status: 'open', location: { lat: '', lng: '' } });
    setShowShelterModal(true);
  };
  const openEditShelter = (shelter) => {
    setEditingShelter(shelter);
    setShelterForm({
      name: shelter.name || '',
      capacity: shelter.capacity || '',
      contact: shelter.contact || '',
      description: shelter.description || '',
      status: shelter.status || 'open',
      location: shelter.location || { lat: '', lng: '' },
    });
    setShowShelterModal(true);
  };
  const closeShelterModal = () => {
    setShowShelterModal(false);
    setEditingShelter(null);
  };

  const handleShelterFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'lat' || name === 'lng') {
      setShelterForm((prev) => ({ ...prev, location: { ...prev.location, [name]: value } }));
    } else {
      setShelterForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleShelterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingShelter) {
        await updateShelter(editingShelter.id, {
          ...shelterForm,
          capacity: parseInt(shelterForm.capacity),
          location: { lat: parseFloat(shelterForm.location.lat), lng: parseFloat(shelterForm.location.lng) },
        });
        setShelters((prev) => prev.map((s) => s.id === editingShelter.id ? { ...s, ...shelterForm, capacity: parseInt(shelterForm.capacity), location: { lat: parseFloat(shelterForm.location.lat), lng: parseFloat(shelterForm.location.lng) } } : s));
        addNotification('Shelter updated successfully!', 'success');
      } else {
        const newShelter = await createShelter({
          ...shelterForm,
          capacity: parseInt(shelterForm.capacity),
          location: { lat: parseFloat(shelterForm.location.lat), lng: parseFloat(shelterForm.location.lng) },
        });
        setShelters((prev) => [newShelter, ...prev]);
        addNotification('Shelter added successfully!', 'success');
      }
      closeShelterModal();
    } catch (error) {
      addNotification('Failed to save shelter', 'error');
    }
  };

  const handleDeleteShelter = async (shelterId) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) return;
    try {
      await deleteShelter(shelterId);
      setShelters((prev) => prev.filter((s) => s.id !== shelterId));
      addNotification('Shelter deleted successfully!', 'success');
    } catch (error) {
      addNotification('Failed to delete shelter', 'error');
    }
  };

  // Load all data
  useEffect(() => {
    if (!user || !user.uid || !userData) return;
    const loadAdminData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        
        // Load users
        const allUsers = await getAllUsers();
        console.log('AdminPanel: Loaded users:', allUsers);
        setUsers(allUsers);
        
        // Load requests
        const allRequests = await getRequestsByStatus('pending');
        const inProgressRequests = await getRequestsByStatus('in-progress');
        const resolvedRequests = await getRequestsByStatus('resolved');
        setRequests([...allRequests, ...inProgressRequests, ...resolvedRequests]);
        
        // Load shelters
        const allShelters = await getAllShelters();
        setShelters(allShelters);
        
        // Calculate stats
        setStats({
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter(u => u.verified).length,
          totalRequests: allRequests.length + inProgressRequests.length + resolvedRequests.length,
          pendingRequests: allRequests.length,
          totalShelters: allShelters.length,
          availableSpots: allShelters.reduce((sum, s) => sum + (s.capacity - s.occupied), 0),
        });
        
      } catch (error) {
        console.error('Error loading admin data:', error);
        setErrorMsg(error.message || String(error));
        addNotification('Failed to load admin data', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAdminData();
    }
  }, [user, userData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToRequests((requestsData) => {
      setRequests(requestsData);
      
      // Update stats
      const pending = requestsData.filter(r => r.status === 'pending').length;
      const inProgress = requestsData.filter(r => r.status === 'in-progress').length;
      const resolved = requestsData.filter(r => r.status === 'resolved').length;
      
      setStats(prev => ({
        ...prev,
        totalRequests: requestsData.length,
        pendingRequests: pending,
      }));
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to real-time panic alerts
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActivePanicAlerts((alerts) => {
      setPanicAlerts(alerts);
    });
    return () => unsubscribe();
  }, [user]);

  const handleUserAction = async (userId, action, newRole = null) => {
    try {
      if (action === 'delete') {
        // Note: In a real app, you'd want to implement user deletion
        addNotification('User deletion not implemented in demo', 'info');
        return;
      }
      if (action === 'updateRole' && newRole) {
        await updateUserRole(userId, newRole);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        addNotification(`User role updated to ${newRole}`, 'success');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      addNotification('Failed to update user', 'error');
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      if (action === 'delete') {
        await deleteRequest(requestId);
        setRequests(prev => prev.filter(req => req.id !== requestId));
        addNotification('Request deleted successfully', 'success');
      } else {
        await updateRequestStatus(requestId, action);
        setRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, status: action } : req
        ));
        addNotification(`Request ${action} successfully`, 'success');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      addNotification('Failed to update request', 'error');
    }
  };

  const handleAssignVolunteer = async (requestId, volunteerId) => {
    try {
      await assignVolunteerToRequest(requestId, volunteerId);
      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, assignedVolunteerId: volunteerId } : req
      ));
      addNotification('Volunteer assigned successfully', 'success');
    } catch (error) {
      console.error('Error assigning volunteer:', error);
      addNotification('Failed to assign volunteer', 'error');
    }
  };

  const handleShelterAction = async (shelterId, action, updates = {}) => {
    try {
      if (action === 'delete') {
        await deleteShelter(shelterId);
        setShelters(prev => prev.filter(shelter => shelter.id !== shelterId));
        addNotification('Shelter deleted successfully', 'success');
        return;
      }
      if (action === 'update' && updates) {
        await updateShelter(shelterId, updates);
        setShelters(prev => prev.map(s => s.id === shelterId ? { ...s, ...updates } : s));
        addNotification('Shelter updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating shelter:', error);
      addNotification('Failed to update shelter', 'error');
    }
  };
// ...existing code...

  const renderUserManagement = () => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>User Management</h2>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Name</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Email</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Role</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Status</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{user.displayName || 'Anonymous'}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{user.email}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <select
                    value={user.role}
                    onChange={(e) => handleUserAction(user.id, 'updateRole', e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      fontSize: '14px'
                    }}
                  >
                    {Object.entries(USER_ROLES).map(([key, value]) => (
                      <option key={value} value={value}>
                        {key.charAt(0) + key.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 12, 
                    fontSize: 12,
                    backgroundColor: user.verified ? '#38a169' : '#e53e3e',
                    color: '#fff',
                    fontWeight: '600'
                  }}>
                    {user.verified ? 'Verified' : 'Unverified'}
                  </span>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => handleUserAction(user.id, 'delete')}
                    style={{ 
                      background: '#e53e3e', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 6, 
                      padding: '6px 12px', 
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRequestMonitoring = () => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Request Monitoring</h2>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Requester</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Category</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Urgency</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Status</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Assigned Volunteer</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Location</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Time</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(request => (
              <tr key={request.id}>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600 }}>{request.contact?.name || 'Anonymous'}</div>
                  {request.panic && (
                    <span style={{ color: '#fff', background: '#e53e3e', borderRadius: 8, padding: '2px 8px', fontWeight: 700, marginLeft: 8, fontSize: 12, verticalAlign: 'middle' }}>PANIC</span>
                  )}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{getCategoryIcon(request.category)}</span>
                    <span style={{ textTransform: 'capitalize' }}>{request.category}</span>
                  </div>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    backgroundColor: getUrgencyColor(request.urgency),
                    color: '#fff',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {request.urgency}
                  </span>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 12, 
                    fontSize: 12,
                    backgroundColor: getStatusColor(request.status),
                    color: '#fff',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {request.status}
                  </span>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <select
                    value={request.assignedVolunteerId || ''}
                    onChange={e => handleAssignVolunteer(request.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '14px' }}
                  >
                    <option value=''>Unassigned</option>
                    {users.filter(u => u.role === 'volunteer').map(vol => (
                      <option key={vol.id} value={vol.id}>
                        {vol.displayName || vol.email}
                      </option>
                    ))}
                  </select>
                  {request.assignedVolunteerId && (
                    <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                      Assigned: {users.find(u => u.id === request.assignedVolunteerId)?.displayName || users.find(u => u.id === request.assignedVolunteerId)?.email || 'Unknown'}
                    </div>
                  )}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9', minWidth: 200 }}>
                  <RequestLocationMap
                    latitude={request.latitude}
                    longitude={request.longitude}
                    panic={request.panic}
                    popupText={request.panic ? '🚨 Panic Alert' : request.title}
                  />
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#718096' }}>
                  {formatTime(request.createdAt)}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleRequestAction(request.id, 'in-progress')}
                          style={{ 
                            background: '#3182ce', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 6, 
                            padding: '6px 12px', 
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestAction(request.id, 'cancelled')}
                          style={{ 
                            background: '#e53e3e', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 6, 
                            padding: '6px 12px', 
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleRequestAction(request.id, 'delete')}
                      style={{ 
                        background: '#e53e3e', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 6, 
                        padding: '6px 12px', 
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderShelterManagement = () => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Shelter Management</h2>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={openAddShelter}
          style={{
            background: '#3182ce',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer'
          }}
        >
          + Add Shelter
        </button>
      </div>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Name</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Capacity</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Occupied</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Available</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Status</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#4a5568', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shelters.map(shelter => (
              <tr key={shelter.id}>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.name}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.capacity}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.occupied}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>{shelter.capacity - shelter.occupied}</td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 12, 
                    fontSize: 12,
                    backgroundColor: shelter.status === 'open' ? '#38a169' : '#e53e3e',
                    color: '#fff',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {shelter.status}
                  </span>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleShelterAction(shelter.id, 'update', { status: shelter.status === 'open' ? 'closed' : 'open' })}
                      style={{ 
                        background: shelter.status === 'open' ? '#e53e3e' : '#38a169', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 6, 
                        padding: '6px 12px', 
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {shelter.status === 'open' ? 'Close' : 'Open'}
                    </button>
                    <button
                      onClick={() => handleShelterAction(shelter.id, 'delete')}
                      style={{ 
                        background: '#e53e3e', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: 6, 
                        padding: '6px 12px', 
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Shelter Modal */}
      {showShelterModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleShelterSubmit} style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ color: '#2d3748', marginBottom: 20, fontSize: '1.3rem', fontWeight: '600' }}>{editingShelter ? 'Edit Shelter' : 'Add Shelter'}</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Name</label>
              <input name="name" value={shelterForm.name} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Capacity</label>
              <input name="capacity" type="number" value={shelterForm.capacity} onChange={handleShelterFormChange} required min={1} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Contact</label>
              <input name="contact" value={shelterForm.contact} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Description</label>
              <textarea name="description" value={shelterForm.description} onChange={handleShelterFormChange} rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
            </div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Latitude</label>
                <input name="lat" type="number" value={shelterForm.location.lat} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Longitude</label>
                <input name="lng" type="number" value={shelterForm.location.lng} onChange={handleShelterFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Status</label>
              <select name="status" value={shelterForm.status} onChange={handleShelterFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="limited">Limited</option>
                <option value="full">Full</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeShelterModal} style={{ background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>{editingShelter ? 'Update' : 'Add'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Reports & Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#2d3748', marginBottom: 16, fontSize: '1.2rem', fontWeight: '600' }}>Request Statistics</h3>
          <div style={{ fontSize: 14, color: '#718096' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Total Requests:</span>
              <span style={{ fontWeight: '600', color: '#2d3748' }}>{stats.totalRequests}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Pending:</span>
              <span style={{ fontWeight: '600', color: '#d69e2e' }}>{stats.pendingRequests}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>In Progress:</span>
              <span style={{ fontWeight: '600', color: '#3182ce' }}>{requests.filter(r => r.status === 'in-progress').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Completed:</span>
              <span style={{ fontWeight: '600', color: '#38a169' }}>{requests.filter(r => r.status === 'resolved').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Response Time:</span>
              <span style={{ fontWeight: '600', color: '#2d3748' }}>2.5 hours avg</span>
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#2d3748', marginBottom: 16, fontSize: '1.2rem', fontWeight: '600' }}>User Statistics</h3>
          <div style={{ fontSize: 14, color: '#718096' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Total Users:</span>
              <span style={{ fontWeight: '600', color: '#2d3748' }}>{stats.totalUsers}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Active Users:</span>
              <span style={{ fontWeight: '600', color: '#38a169' }}>{stats.activeUsers}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Volunteers:</span>
              <span style={{ fontWeight: '600', color: '#3182ce' }}>{users.filter(u => u.role === 'volunteer').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Requesters:</span>
              <span style={{ fontWeight: '600', color: '#dd6b20' }}>{users.filter(u => u.role === 'requester').length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Admins:</span>
              <span style={{ fontWeight: '600', color: '#805ad5' }}>{users.filter(u => u.role === 'admin').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>System Settings</h2>
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', border: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>System Maintenance Mode</label>
          <button style={{ 
            background: '#667eea', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Enable Maintenance Mode
          </button>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>Backup Database</label>
          <button style={{ 
            background: '#38a169', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Create Backup
          </button>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: '600', color: '#4a5568' }}>Clear Cache</label>
          <button style={{ 
            background: '#dd6b20', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 8, 
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Clear All Caches
          </button>
        </div>
      </div>
    </div>
  );

  const renderMap = () => (
    <div>
      <h2 style={{ color: '#2d3748', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
        🗺️ Live Emergency Requests Map
      </h2>
      <div style={{ marginBottom: '1rem', color: '#718096' }}>
        View all active emergency requests on the map. Click on markers to see details.
      </div>
      <RequestsMap 
        onRequestSelect={(request) => {
          console.log('Selected request:', request);
          // You can add a modal or sidebar to show request details
        }}
      />
    </div>
  );

  const renderPanicAlerts = () => (
    <div>
      <h2 style={{ color: '#e53e3e', marginBottom: 20, fontSize: '2rem', fontWeight: '600' }}>Active Panic Alerts</h2>
      {panicAlerts.length === 0 ? (
        <div style={{ color: '#718096', textAlign: 'center', padding: 32 }}>
          No active panic alerts.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px #e2e8f0', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>User</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Time</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Location</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Contact</th>
              <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {panicAlerts.map(alert => (
              <tr key={alert.id} style={{ background: '#fff8f8' }}>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600 }}>{alert.displayName || alert.email || alert.userId}</div>
                  <div style={{ fontSize: 12, color: '#718096' }}>{alert.email}</div>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  {alert.timestamp && alert.timestamp.toDate ? alert.timestamp.toDate().toLocaleString() : 'Now'}
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9', minWidth: 200 }}>
                  <RequestLocationMap
                    latitude={alert.latitude}
                    longitude={alert.longitude}
                    panic={alert.panic}
                    popupText={alert.panic ? '🚨 Panic Alert' : alert.displayName}
                  />
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <a href={`mailto:${alert.email}`} style={{ color: '#3182ce', fontSize: 12, marginRight: 8 }}>Email</a>
                  <a href={`tel:${alert.phone || ''}`} style={{ color: '#3182ce', fontSize: 12 }}>Call</a>
                </td>
                <td style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => handleResolvePanicAlert(alert.id)}
                    style={{ background: '#38a169', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                  >
                    Mark as Resolved
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'User Management' },
    { id: 'requests', label: 'Request Monitoring' },
    { id: 'map', label: 'Live Map' },
    { id: 'shelters', label: 'Shelter Management' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' },
    { id: 'panic', label: 'Panic Alerts' },
  ];

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
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
          <div>Loading admin panel...</div>
          {errorMsg && (
            <div style={{ color: 'red', marginTop: 16, fontWeight: 600 }}>
              Error: {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ 
      background: '#f7f9fb', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ 
          color: '#2d3748', 
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '2.5rem',
          fontWeight: '700'
        }}>
          {t('admin.title') || 'Admin Panel'}
        </h1>
        
        {/* Tab Navigation */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 20, 
          boxShadow: '0 4px 12px #e2e8f0',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ 
                  background: activeTab === tab.id ? '#667eea' : '#fff', 
                  color: activeTab === tab.id ? '#fff' : '#4a5568', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: 8, 
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 32, 
          boxShadow: '0 4px 12px #e2e8f0',
          border: '1px solid #e2e8f0'
        }}>
          {activeTab === 'dashboard' && renderDashboard(stats)}
          {activeTab === 'users' && renderUserManagement()}
          {activeTab === 'requests' && renderRequestMonitoring()}
          {activeTab === 'map' && renderMap()}
          {activeTab === 'shelters' && renderShelterManagement()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'panic' && renderPanicAlerts()}
        </div>
      </div>
    </div>
  );
};
      
export default AdminPanelPage;