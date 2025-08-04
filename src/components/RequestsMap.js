import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToRequests } from '../firebase/requests';
import { useAuth } from '../contexts/AuthContext';

// Fallback component for when map fails
const RequestsList = ({ requests, onRequestSelect }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: '#d69e2e',
      'in-progress': '#3182ce',
      assigned: '#805ad5',
      resolved: '#38a169'
    };
    return colors[status] || '#6c757d';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      medical: '🏥',
      shelter: '🏠',
      food: '🍽️',
      transport: '🚗',
      other: '❓'
    };
    return icons[category] || '❓';
  };

  return (
    <div className="w-full h-96 overflow-y-auto bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Active Emergency Requests</h3>
      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No active emergency requests found.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div 
              key={request.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onRequestSelect && onRequestSelect(request)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getCategoryIcon(request.category)}</span>
                  <span className="font-medium text-gray-800 capitalize">{request.category}</span>
                </div>
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full text-white"
                  style={{ backgroundColor: getStatusColor(request.status) }}
                >
                  {request.status}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Requester:</strong> {request.requesterName || 'Anonymous'}</p>
                <p><strong>Description:</strong> {request.description}</p>
                <p><strong>Posted:</strong> {new Date(request.timestamp?.seconds * 1000).toLocaleString()}</p>
                {request.location && (
                  <p><strong>Location:</strong> {request.location.address || `Lat: ${request.location.lat}, Lng: ${request.location.lng}`}</p>
                )}
                {request.distance && (
                  <p><strong>Distance:</strong> {request.distance}km</p>
                )}
                {request.urgency && (
                  <p><strong>Urgency:</strong> {request.urgency}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RequestsMap = ({ onRequestSelect, selectedRequestId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    let unsubscribe;
    
    try {
      unsubscribe = subscribeToRequests((requestsData) => {
        try {
          // Filter only active requests (not resolved/closed)
          const activeRequests = requestsData.filter(req => 
            req.status !== 'resolved' && req.status !== 'closed'
          );
          setRequests(activeRequests);
          setLoading(false);
        } catch (error) {
          console.error('Error processing requests data:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error subscribing to requests:', error);
      setLoading(false);
    }

    return () => {
      try {
        if (unsubscribe) {
          unsubscribe();
        }
      } catch (error) {
        console.error('Error unsubscribing from requests:', error);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  // Always use the fallback list view to avoid Leaflet issues
  return <RequestsList requests={requests} onRequestSelect={onRequestSelect} />;
};

export default RequestsMap; 