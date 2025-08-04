import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

// Add new geo zone
export const addGeoZone = async (zoneData) => {
  try {
    const zone = {
      ...zoneData,
      lastUpdated: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'geo_zones'), zone);
    return { success: true, zoneId: docRef.id };
  } catch (error) {
    console.error('Add geo zone error:', error);
    return { success: false, error: error.message };
  }
};

// Update geo zone
export const updateGeoZone = async (zoneId, updates) => {
  try {
    const docRef = doc(db, 'geo_zones', zoneId);
    await updateDoc(docRef, { ...updates, lastUpdated: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error('Update geo zone error:', error);
    return { success: false, error: error.message };
  }
};

// Delete geo zone
export const deleteGeoZone = async (zoneId) => {
  try {
    await deleteDoc(doc(db, 'geo_zones', zoneId));
    return { success: true };
  } catch (error) {
    console.error('Delete geo zone error:', error);
    return { success: false, error: error.message };
  }
};

// Get geo zone by ID
export const getGeoZoneById = async (zoneId) => {
  try {
    const docRef = doc(db, 'geo_zones', zoneId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Geo zone not found' };
    }
  } catch (error) {
    console.error('Get geo zone error:', error);
    return { success: false, error: error.message };
  }
};

// Get all geo zones
export const getAllGeoZones = async () => {
  try {
    const q = query(collection(db, 'geo_zones'), orderBy('lastUpdated', 'desc'));
    const querySnapshot = await getDocs(q);
    const zones = [];
    querySnapshot.forEach((doc) => {
      zones.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: zones };
  } catch (error) {
    console.error('Get all geo zones error:', error);
    return { success: false, error: error.message };
  }
};

// Real-time listener for geo zones
export const subscribeToGeoZones = (callback) => {
  const q = query(collection(db, 'geo_zones'), orderBy('lastUpdated', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const zones = [];
    snapshot.forEach((doc) => {
      zones.push({ id: doc.id, ...doc.data() });
    });
    callback(zones);
  });
}; 