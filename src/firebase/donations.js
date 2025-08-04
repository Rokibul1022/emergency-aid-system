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
  limit, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';


// Donation statuses
export const DONATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Donation types
export const DONATION_TYPES = {
  MONETARY: 'monetary',
  GOODS: 'goods',
  SERVICES: 'services'
};

// Create a new donation
export const createDonation = async (donationData) => {
  try {
    const {
      title,
      category,
      description,
      amount,
      type,
      donorId,
      donorName,
      linkedRequestId,
      status = DONATION_STATUS.PENDING
    } = donationData;

    const donation = {
      title,
      category,
      description,
      amount: type === DONATION_TYPES.MONETARY ? parseFloat(amount) : null,
      type,
      donorId,
      donorName,
      linkedRequestId,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approvedAt: null,
      deliveredAt: null
    };

    const docRef = await addDoc(collection(db, 'donations'), donation);
    return { id: docRef.id, ...donation };
  } catch (error) {
    console.error('Error creating donation:', error);
    throw error;
  }
};

// Get a single donation by ID
export const getDonation = async (donationId) => {
  try {
    const donationRef = doc(db, 'donations', donationId);
    const donationSnap = await getDoc(donationRef);
    
    if (donationSnap.exists()) {
      return {
        id: donationSnap.id,
        ...donationSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting donation:', error);
    throw error;
  }
};

// Get all donations
export const getAllDonations = async () => {
  try {
    const donationsRef = collection(db, 'donations');
    const q = query(donationsRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const donations = [];
    
    querySnapshot.forEach((doc) => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return donations;
  } catch (error) {
    console.error('Error getting donations:', error);
    throw error;
  }
};

// Get donations by donor
export const getDonationsByDonor = async (donorId) => {
  try {
    const donationsRef = collection(db, 'donations');
    const q = query(
      donationsRef,
      where('donorId', '==', donorId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const donations = [];
    
    querySnapshot.forEach((doc) => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return donations;
  } catch (error) {
    console.error('Error getting donations by donor:', error);
    throw error;
  }
};

// Get donations by status
export const getDonationsByStatus = async (status) => {
  try {
    const donationsRef = collection(db, 'donations');
    const q = query(
      donationsRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const donations = [];
    
    querySnapshot.forEach((doc) => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return donations;
  } catch (error) {
    console.error('Error getting donations by status:', error);
    throw error;
  }
};

// Get donations by category
export const getDonationsByCategory = async (category) => {
  try {
    const donationsRef = collection(db, 'donations');
    const q = query(
      donationsRef,
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const donations = [];
    
    querySnapshot.forEach((doc) => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return donations;
  } catch (error) {
    console.error('Error getting donations by category:', error);
    throw error;
  }
};

// Get donations linked to a specific request
export const getDonationsByRequest = async (requestId) => {
  try {
    const donationsRef = collection(db, 'donations');
    const q = query(
      donationsRef,
      where('linkedRequestId', '==', requestId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const donations = [];
    
    querySnapshot.forEach((doc) => {
      donations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return donations;
  } catch (error) {
    console.error('Error getting donations by request:', error);
    throw error;
  }
};

// Update donation status
export const updateDonationStatus = async (donationId, status) => {
  try {
    const donationRef = doc(db, 'donations', donationId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === DONATION_STATUS.APPROVED) {
      updateData.approvedAt = serverTimestamp();
    } else if (status === DONATION_STATUS.DELIVERED) {
      updateData.deliveredAt = serverTimestamp();
    }
    
    await updateDoc(donationRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating donation status:', error);
    throw error;
  }
};

// Update donation
export const updateDonation = async (donationId, updates) => {
  try {
    const donationRef = doc(db, 'donations', donationId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(donationRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating donation:', error);
    throw error;
  }
};

// Delete donation
export const deleteDonation = async (donationId) => {
  try {
    const donationRef = doc(db, 'donations', donationId);
    await deleteDoc(donationRef);
    return true;
  } catch (error) {
    console.error('Error deleting donation:', error);
    throw error;
  }
};

// Real-time listener for donations
export const subscribeToDonations = (callback, filters = {}) => {
  try {
    let q = collection(db, 'donations');
    
    // Apply filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.donorId) {
      q = query(q, where('donorId', '==', filters.donorId));
    }
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.linkedRequestId) {
      q = query(q, where('linkedRequestId', '==', filters.linkedRequestId));
    }
    
    // Always order by creation date
    q = query(q, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const donations = [];
      querySnapshot.forEach((doc) => {
        donations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(donations);
    });
  } catch (error) {
    console.error('Error subscribing to donations:', error);
    throw error;
  }
};

// Get donation statistics
export const getDonationStats = async () => {
  try {
    const donationsRef = collection(db, 'donations');
    const querySnapshot = await getDocs(donationsRef);
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      delivered: 0,
      totalAmount: 0,
      byType: {
        monetary: 0,
        goods: 0,
        services: 0
      },
      byCategory: {}
    };
    
    querySnapshot.forEach((doc) => {
      const donation = doc.data();
      stats.total++;
      
      // Count by status
      if (donation.status) {
        stats[donation.status] = (stats[donation.status] || 0) + 1;
      }
      
      // Count by type
      if (donation.type) {
        stats.byType[donation.type] = (stats.byType[donation.type] || 0) + 1;
      }
      
      // Count by category
      if (donation.category) {
        stats.byCategory[donation.category] = (stats.byCategory[donation.category] || 0) + 1;
      }
      
      // Sum monetary amounts
      if (donation.type === DONATION_TYPES.MONETARY && donation.amount) {
        stats.totalAmount += donation.amount;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting donation stats:', error);
    throw error;
  }
};

const donationsService = {
  createDonation,
  getDonation,
  getAllDonations,
  getDonationsByDonor,
  getDonationsByStatus,
  getDonationsByCategory,
  getDonationsByRequest,
  updateDonationStatus,
  updateDonation,
  deleteDonation,
  subscribeToDonations,
  getDonationStats,
  DONATION_STATUS,
  DONATION_TYPES
};

export default donationsService; 