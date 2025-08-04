import { collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, doc, serverTimestamp, getDocs, deleteDoc, getDoc, limit, GeoPoint } from 'firebase/firestore';
import { db } from './config';

// Request statuses
export const REQUEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  ASSIGNED: 'assigned',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled'
};

// Request urgency levels
export const URGENCY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Request categories
export const REQUEST_CATEGORIES = {
  MEDICAL: 'medical',
  FOOD: 'food',
  SHELTER: 'shelter',
  TRANSPORT: 'transport',
  CLOTHING: 'clothing',
  OTHER: 'other'
};

// Subscribe to all requests with real-time updates
export const subscribeToRequests = (callback) => {
  const q = query(
    collection(db, 'requests'),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(requests);
  });
};

// Subscribe to requests by status
export const subscribeToRequestsByStatus = (status, callback) => {
  const q = query(
    collection(db, 'requests'),
    where('status', '==', status),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(requests);
  });
};

// Subscribe to requests near a location
export const subscribeToNearbyRequests = (userLat, userLng, maxDistance = 50, callback) => {
  const q = query(
    collection(db, 'requests'),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = [];
    snapshot.forEach((doc) => {
      const request = {
        id: doc.id,
        ...doc.data()
      };
      
      // Calculate distance if request has location
      if (request.location && request.location.lat && request.location.lng) {
        const distance = calculateDistance(
          userLat, userLng,
          request.location.lat, request.location.lng
        );
        
        if (distance <= maxDistance) {
          request.distance = distance;
          requests.push(request);
        }
      }
    });
    
    // Sort by distance
    requests.sort((a, b) => a.distance - b.distance);
    callback(requests);
  });
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// Create a new request
export const createRequest = async (requestData) => {
  try {
    const docRef = await addDoc(collection(db, 'requests'), {
      ...requestData,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating request:', error);
    return { success: false, error: error.message };
  }
};

// Update request status
export const updateRequestStatus = async (requestId, status, additionalData = {}) => {
  try {
    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, {
      status,
      lastUpdated: serverTimestamp(),
      ...additionalData
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating request status:', error);
    return { success: false, error: error.message };
  }
};

// Assign volunteer to request
export const assignVolunteerToRequest = async (requestId, volunteerId, volunteerName, volunteerPhone) => {
  try {
    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, {
      assignedVolunteer: volunteerId,
      assignedVolunteerName: volunteerName,
      assignedVolunteerPhone: volunteerPhone,
      status: 'assigned',
      assignedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error assigning volunteer:', error);
    return { success: false, error: error.message };
  }
};

// Get requests by status (for AdminPanelPage)
export const getRequestsByStatus = async (status, limitCount = 50) => {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(
      requestsRef,
      where('status', '==', status),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.lat,
          lng: data.location.lng
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting requests by status:', error);
    return [];
  }
};

// Get requests by requester ID (for DashboardPage and MyRequestsPage)
export const getRequestsByRequester = async (requesterId) => {
  try {
    if (!requesterId) {
      return [];
    }
    
    const requestsRef = collection(db, 'requests');
    const q = query(
      requestsRef,
      where('requesterId', '==', requesterId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.lat,
          lng: data.location.lng
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting requests by requester:', error);
    return [];
  }
};

// Get requests by volunteer ID (for DashboardPage)
export const getRequestsByVolunteer = async (volunteerId) => {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(
      requestsRef,
      where('assignedVolunteer', '==', volunteerId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.lat,
          lng: data.location.lng
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting requests by volunteer:', error);
    return [];
  }
};

// Delete request (for AdminPanelPage)
export const deleteRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'requests', requestId);
    await deleteDoc(requestRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting request:', error);
    return { success: false, error: error.message };
  }
};

// Get open requests (for DashboardPage and VolunteerViewPage)
export const getOpenRequests = async (limitCount = 50) => {
  try {
    const requestsRef = collection(db, 'requests');
    const q = query(
      requestsRef,
      where('status', 'in', ['pending', 'in-progress', 'assigned']),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.lat,
          lng: data.location.lng
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting open requests:', error);
    return [];
  }
};

// Create sample data (for DashboardPage)
export const createSampleData = async (userId, userData) => {
  try {
    console.log('Creating sample data for user:', userId);
    
    const sampleRequests = [
      {
        title: 'Medical Emergency',
        description: 'Need immediate medical assistance',
        category: 'medical',
        urgency: 'high',
        status: 'pending',
        contact: {
          name: userData?.displayName || 'Test User',
          phone: userData?.phone || '1234567890',
          email: userData?.email || 'test@example.com'
        },
        location: {
          lat: 23.8103,
          lng: 90.4125
        },
        requesterId: userId,
        timestamp: serverTimestamp()
      },
      {
        title: 'Food Assistance Needed',
        description: 'Running out of food supplies',
        category: 'food',
        urgency: 'medium',
        status: 'in-progress',
        contact: {
          name: userData?.displayName || 'Test User',
          phone: userData?.phone || '1234567890',
          email: userData?.email || 'test@example.com'
        },
        location: {
          lat: 23.8103,
          lng: 90.4125
        },
        requesterId: userId,
        assignedVolunteer: 'test-volunteer-id',
        timestamp: serverTimestamp()
      },
      {
        title: 'Shelter Request',
        description: 'Need temporary shelter',
        category: 'shelter',
        urgency: 'critical',
        status: 'resolved',
        contact: {
          name: userData?.displayName || 'Test User',
          phone: userData?.phone || '1234567890',
          email: userData?.email || 'test@example.com'
        },
        location: {
          lat: 23.8103,
          lng: 90.4125
        },
        requesterId: userId,
        assignedVolunteer: 'test-volunteer-id',
        timestamp: serverTimestamp()
      }
    ];
    
    const createdRequests = [];
    
    for (const requestData of sampleRequests) {
      const result = await createRequest(requestData);
      if (result.success) {
        createdRequests.push(result.id);
        console.log('Created sample request:', result.id);
      }
    }
    
    console.log('Sample data created successfully:', createdRequests.length, 'requests');
    return { success: true, createdRequests };
  } catch (error) {
    console.error('Error creating sample data:', error);
    return { success: false, error: error.message };
  }
}; 