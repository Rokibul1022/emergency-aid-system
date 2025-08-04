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

// Shelter statuses
export const SHELTER_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  LIMITED: 'limited',
  FULL: 'full'
};

// Create a new shelter
export const createShelter = async (shelterData) => {
  try {
    const {
      name,
      location,
      capacity,
      contact,
      description = '',
      amenities = [],
      imageURL = null
    } = shelterData;

    const shelter = {
      name,
      location: location ? new GeoPoint(location.lat, location.lng) : null,
      capacity: parseInt(capacity),
      occupied: 0,
      contact,
      description,
      amenities,
      imageURL,
      status: SHELTER_STATUS.OPEN,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'shelters'), shelter);
    return { id: docRef.id, ...shelter };
  } catch (error) {
    console.error('Error creating shelter:', error);
    throw error;
  }
};

// Get a single shelter by ID
export const getShelter = async (shelterId) => {
  try {
    const shelterRef = doc(db, 'shelters', shelterId);
    const shelterSnap = await getDoc(shelterRef);
    
    if (shelterSnap.exists()) {
      const data = shelterSnap.data();
      return {
        id: shelterSnap.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting shelter:', error);
    throw error;
  }
};

// Get all shelters
export const getAllShelters = async () => {
  try {
    const sheltersRef = collection(db, 'shelters');
    const q = query(sheltersRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const shelters = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shelters.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return shelters;
  } catch (error) {
    console.error('Error getting shelters:', error);
    throw error;
  }
};

// Get shelters by status
export const getSheltersByStatus = async (status) => {
  try {
    const sheltersRef = collection(db, 'shelters');
    const q = query(
      sheltersRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const shelters = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      shelters.push({
        id: doc.id,
        ...data,
        location: data.location ? {
          lat: data.location.latitude,
          lng: data.location.longitude
        } : null
      });
    });
    
    return shelters;
  } catch (error) {
    console.error('Error getting shelters by status:', error);
    throw error;
  }
};

// Get available shelters (with capacity)
export const getAvailableShelters = async () => {
  try {
    const sheltersRef = collection(db, 'shelters');
    const q = query(
      sheltersRef,
      where('status', '==', SHELTER_STATUS.OPEN),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const shelters = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.occupied < data.capacity) {
        shelters.push({
          id: doc.id,
          ...data,
          location: data.location ? {
            lat: data.location.latitude,
            lng: data.location.longitude
          } : null
        });
      }
    });
    
    return shelters;
  } catch (error) {
    console.error('Error getting available shelters:', error);
    throw error;
  }
};

// Update shelter
export const updateShelter = async (shelterId, updates) => {
  try {
    const shelterRef = doc(db, 'shelters', shelterId);
    
    // Handle location updates
    const updateData = { ...updates };
    if (updates.location) {
      updateData.location = new GeoPoint(updates.location.lat, updates.location.lng);
    }
    
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(shelterRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating shelter:', error);
    throw error;
  }
};

// Delete shelter
export const deleteShelter = async (shelterId) => {
  try {
    const shelterRef = doc(db, 'shelters', shelterId);
    await deleteDoc(shelterRef);
    return true;
  } catch (error) {
    console.error('Error deleting shelter:', error);
    throw error;
  }
};

// Update shelter occupancy
export const updateShelterOccupancy = async (shelterId, change) => {
  try {
    const shelterRef = doc(db, 'shelters', shelterId);
    const shelterSnap = await getDoc(shelterRef);
    
    if (shelterSnap.exists()) {
      const shelterData = shelterSnap.data();
      const newOccupied = Math.max(0, Math.min(shelterData.capacity, shelterData.occupied + change));
      
      let newStatus = shelterData.status;
      if (newOccupied >= shelterData.capacity) {
        newStatus = SHELTER_STATUS.FULL;
      } else if (newOccupied > shelterData.capacity * 0.8) {
        newStatus = SHELTER_STATUS.LIMITED;
      } else {
        newStatus = SHELTER_STATUS.OPEN;
      }
      
      await updateDoc(shelterRef, {
        occupied: newOccupied,
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating shelter occupancy:', error);
    throw error;
  }
};

// Real-time listener for shelters
export const subscribeToShelters = (callback, filters = {}) => {
  try {
    let q = collection(db, 'shelters');
    
    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    // Always order by creation date
    q = query(q, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const shelters = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        shelters.push({
          id: doc.id,
          ...data,
          location: data.location ? {
            lat: data.location.latitude,
            lng: data.location.longitude
          } : null
        });
      });
      callback(shelters);
    });
  } catch (error) {
    console.error('Error subscribing to shelters:', error);
    throw error;
  }
};

// Get nearby shelters (within specified radius)
export const getNearbyShelters = async (userLat, userLng, radiusKm = 10) => {
  try {
    const shelters = await getAvailableShelters();
    return shelters.filter(shelter => {
      if (!shelter.location) return false;
      const distance = calculateDistance(
        userLat, 
        userLng, 
        shelter.location.lat, 
        shelter.location.lng
      );
      return distance <= radiusKm;
    });
  } catch (error) {
    console.error('Error getting nearby shelters:', error);
    throw error;
  }
};

// Calculate distance between two points (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const sheltersService = {
  createShelter,
  getShelter,
  getAllShelters,
  getSheltersByStatus,
  getAvailableShelters,
  updateShelter,
  deleteShelter,
  updateShelterOccupancy,
  subscribeToShelters,
  getNearbyShelters,
  SHELTER_STATUS
};

export default sheltersService; 