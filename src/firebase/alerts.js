import { db } from './config';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';

// Create a new panic alert
export const createPanicAlert = async ({ userId, displayName, email, location, phone }) => {
  try {
    // Clean location object to avoid undefined fields
    let cleanLocation = null;
    if (location && (location.lat !== undefined && location.lng !== undefined)) {
      cleanLocation = {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
        timestamp: location.timestamp || Date.now(),
      };
      if (typeof location.accuracy === 'number') {
        cleanLocation.accuracy = location.accuracy;
      }
    }
    const docRef = await addDoc(collection(db, 'panic_alerts'), {
      userId,
      displayName,
      email,
      phone: phone || '',
      location: cleanLocation,
      latitude: cleanLocation ? cleanLocation.lat : null,
      longitude: cleanLocation ? cleanLocation.lng : null,
      timestamp: serverTimestamp(),
      panic: true,
      resolved: false
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating panic alert:', error);
    throw error;
  }
};

// Subscribe to active (unresolved) panic alerts
export const subscribeToActivePanicAlerts = (callback) => {
  const q = query(
    collection(db, 'panic_alerts'),
    where('resolved', '==', false),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const alerts = [];
    snapshot.forEach(doc => alerts.push({ id: doc.id, ...doc.data() }));
    callback(alerts);
  });
}; 