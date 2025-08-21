import { db } from './config';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';

// Fetch all asked donations (one-time fetch)
export const getAllAskedDonations = async () => {
  try {
    const q = query(collection(db, 'asked_donations'), where('status', 'in', ['pending', 'matched']));
    const querySnapshot = await getDocs(q);
    const donations = [];
    querySnapshot.forEach((doc) => {
      donations.push({ id: doc.id, ...doc.data() });
    });
    return donations;
  } catch (error) {
    console.error('Error fetching asked donations:', error);
    throw error;
  }
};

// Subscribe to real-time updates for asked donations
export const subscribeToAskedDonations = (callback) => {
  try {
    const q = query(collection(db, 'asked_donations'), where('status', 'in', ['pending', 'matched']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donations = [];
      snapshot.forEach((doc) => {
        donations.push({ id: doc.id, ...doc.data() });
      });
      callback(donations);
    }, (error) => {
      console.error('Error subscribing to asked donations:', error);
    });
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up subscription:', error);
    throw error;
  }
};