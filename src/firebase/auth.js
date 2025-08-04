import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from './config';

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  REQUESTER: 'requester',
  VOLUNTEER: 'volunteer'
};

// Force create or update user document
export const forceCreateUserDocument = async (user, role = USER_ROLES.REQUESTER, additionalData = {}) => {
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);
  
  const userData = {
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email,
    photoURL: user.photoURL || null,
    role: role,
    createdAt: new Date(),
    verified: false,
    ...additionalData
  };

  try {
    await setDoc(userRef, userData, { merge: true });
    return { id: user.uid, ...userData };
  } catch (error) {
    console.error('Error force creating user document:', error);
    throw error;
  }
};

// Create user document in Firestore
const createUserDocument = async (user, role = USER_ROLES.REQUESTER, additionalData = {}) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = new Date();

    try {
      await setDoc(userRef, {
        displayName,
        email,
        photoURL,
        role,
        createdAt,
        verified: false,
        location: null,
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  }

  return userRef;
};

// Sign up with email and password
export const signUpWithEmail = async (email, password, displayName, role = USER_ROLES.REQUESTER, additionalData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Create user document in Firestore
    await createUserDocument(user, role, { displayName, ...additionalData });

    return { user, role };
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (role = USER_ROLES.REQUESTER) => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Create user document if it doesn't exist
    await createUserDocument(user, role);

    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Get current user data from Firestore
export const getCurrentUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Update user role (Admin only)
export const updateUserRole = async (userId, newRole) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role: newRole });
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Get all users (Admin only)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

// Get users by role
export const getUsersByRole = async (role) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', role));
    const querySnapshot = await getDocs(q);
    const users = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Auth state listener
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback);
};

const authService = {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  getCurrentUserData,
  updateUserRole,
  getAllUsers,
  getUsersByRole,
  updateUserProfile,
  onAuthStateChangedListener,
  USER_ROLES
};

export default authService; 