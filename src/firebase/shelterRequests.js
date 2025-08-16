import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  GeoPoint
} from 'firebase/firestore';
import { db } from './config';

// Shelter request statuses
export const SHELTER_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

// Create a new shelter request
export const createShelterRequest = async (requestData) => {
  try {
    const {
      requesterId,
      requesterName,
      requesterPhone,
      requesterEmail,
      shelterId,
      shelterName,
      numberOfPeople,
      urgency,
      specialNeeds,
      estimatedDuration,
      location,
      notes
    } = requestData;

    const shelterRequest = {
      requesterId,
      requesterName,
      requesterPhone,
      requesterEmail,
      shelterId,
      shelterName,
      numberOfPeople: parseInt(numberOfPeople),
      urgency,
      specialNeeds: specialNeeds || [],
      estimatedDuration: parseInt(estimatedDuration),
      location: location ? new GeoPoint(location.lat, location.lng) : null,
      notes: notes || '',
      status: SHELTER_REQUEST_STATUS.PENDING,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      assignedVolunteerId: null,
      assignedAt: null,
      responseNotes: null
    };

    const docRef = await addDoc(collection(db, 'shelter_requests'), shelterRequest);
    return { id: docRef.id, ...shelterRequest };
  } catch (error) {
    console.error('Error creating shelter request:', error);
    throw error;
  }
};

// Get a single shelter request by ID
export const getShelterRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (requestSnap.exists()) {
      const data = requestSnap.data();
      return {
        id: requestSnap.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting shelter request:', error);
    throw error;
  }
};

// Get all shelter requests
export const getAllShelterRequests = async () => {
  try {
    const requestsRef = collection(db, 'shelter_requests');
    const q = query(requestsRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting shelter requests:', error);
    throw error;
  }
};

// Get shelter requests by status
export const getShelterRequestsByStatus = async (status) => {
  try {
    const requestsRef = collection(db, 'shelter_requests');
    const q = query(
      requestsRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting shelter requests by status:', error);
    throw error;
  }
};

// Get shelter requests by requester
export const getShelterRequestsByRequester = async (requesterId) => {
  try {
    const requestsRef = collection(db, 'shelter_requests');
    const q = query(
      requestsRef,
      where('requesterId', '==', requesterId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting shelter requests by requester:', error);
    throw error;
  }
};

// Get shelter requests by shelter
export const getShelterRequestsByShelter = async (shelterId) => {
  try {
    const requestsRef = collection(db, 'shelter_requests');
    const q = query(
      requestsRef,
      where('shelterId', '==', shelterId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting shelter requests by shelter:', error);
    throw error;
  }
};

// Update shelter request
export const updateShelterRequest = async (requestId, updates) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    
    // Handle location updates
    const updateData = { ...updates };
    if (updates.location) {
      updateData.location = new GeoPoint(updates.location.lat, updates.location.lng);
    }
    
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(requestRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating shelter request:', error);
    throw error;
  }
};

// Delete shelter request
export const deleteShelterRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    await deleteDoc(requestRef);
    return true;
  } catch (error) {
    console.error('Error deleting shelter request:', error);
    throw error;
  }
};

// Approve shelter request
export const approveShelterRequest = async (requestId, volunteerId, responseNotes = null) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    
    await updateDoc(requestRef, {
      status: SHELTER_REQUEST_STATUS.APPROVED,
      assignedVolunteerId: volunteerId,
      assignedAt: serverTimestamp(),
      responseNotes,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error approving shelter request:', error);
    throw error;
  }
};

// Reject shelter request
export const rejectShelterRequest = async (requestId, volunteerId, responseNotes = null) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    
    await updateDoc(requestRef, {
      status: SHELTER_REQUEST_STATUS.REJECTED,
      assignedVolunteerId: volunteerId,
      assignedAt: serverTimestamp(),
      responseNotes,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting shelter request:', error);
    throw error;
  }
};

// Complete shelter request
export const completeShelterRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    
    await updateDoc(requestRef, {
      status: SHELTER_REQUEST_STATUS.COMPLETED,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error completing shelter request:', error);
    throw error;
  }
};

// Cancel shelter request
export const cancelShelterRequest = async (requestId) => {
  try {
    const requestRef = doc(db, 'shelter_requests', requestId);
    
    await updateDoc(requestRef, {
      status: SHELTER_REQUEST_STATUS.CANCELLED,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error cancelling shelter request:', error);
    throw error;
  }
};

// Real-time listener for shelter requests
export const subscribeToShelterRequests = (callback, filters = {}) => {
  try {
    let q = collection(db, 'shelter_requests');
    
    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.requesterId) {
      q = query(q, where('requesterId', '==', filters.requesterId));
    }
    if (filters.shelterId) {
      q = query(q, where('shelterId', '==', filters.shelterId));
    }
    
    // Always order by creation date
    q = query(q, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const requests = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          location: data.location ? {
            lat: data.location.latitude,
            lng: data.location.longitude
          } : null
        });
      });
      callback(requests);
    });
  } catch (error) {
    console.error('Error subscribing to shelter requests:', error);
    throw error;
  }
};

// Get pending shelter requests for a volunteer
export const getPendingShelterRequestsForVolunteer = async () => {
  try {
    const requests = await getShelterRequestsByStatus(SHELTER_REQUEST_STATUS.PENDING);
    return requests;
  } catch (error) {
    console.error('Error getting pending shelter requests for volunteer:', error);
    throw error;
  }
};

// Get assigned shelter requests for a volunteer
export const getAssignedShelterRequestsForVolunteer = async (volunteerId) => {
  try {
    const requestsRef = collection(db, 'shelter_requests');
    const q = query(
      requestsRef,
      where('assignedVolunteerId', '==', volunteerId),
      where('status', 'in', [SHELTER_REQUEST_STATUS.APPROVED, SHELTER_REQUEST_STATUS.REJECTED]),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const requests = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting assigned shelter requests for volunteer:', error);
    throw error;
  }
};

const shelterRequestsService = {
  createShelterRequest,
  getShelterRequest,
  getAllShelterRequests,
  getShelterRequestsByStatus,
  getShelterRequestsByRequester,
  getShelterRequestsByShelter,
  updateShelterRequest,
  deleteShelterRequest,
  approveShelterRequest,
  rejectShelterRequest,
  completeShelterRequest,
  cancelShelterRequest,
  subscribeToShelterRequests,
  getPendingShelterRequestsForVolunteer,
  getAssignedShelterRequestsForVolunteer,
  SHELTER_REQUEST_STATUS
};

export default shelterRequestsService;
