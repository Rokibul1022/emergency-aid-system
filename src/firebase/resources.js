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
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';

// Upload file to Firebase Storage and return URL
export const uploadResourceFile = async (file, folder = 'resources') => {
  try {
    const fileRef = storageRef(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { success: true, url };
  } catch (error) {
    console.error('Upload file error:', error);
    return { success: false, error: error.message };
  }
};

// Add new resource (metadata in Firestore)
export const addResource = async (resourceData) => {
  try {
    const resource = {
      ...resourceData,
      timestamp: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'resources'), resource);
    return { success: true, resourceId: docRef.id };
  } catch (error) {
    console.error('Add resource error:', error);
    return { success: false, error: error.message };
  }
};

// Update resource
export const updateResource = async (resourceId, updates) => {
  try {
    const docRef = doc(db, 'resources', resourceId);
    await updateDoc(docRef, { ...updates, timestamp: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error('Update resource error:', error);
    return { success: false, error: error.message };
  }
};

// Delete resource (metadata and file)
export const deleteResource = async (resourceId, fileURL) => {
  try {
    await deleteDoc(doc(db, 'resources', resourceId));
    if (fileURL) {
      const fileRef = storageRef(storage, fileURL);
      await deleteObject(fileRef);
    }
    return { success: true };
  } catch (error) {
    console.error('Delete resource error:', error);
    return { success: false, error: error.message };
  }
};

// Get resource by ID
export const getResourceById = async (resourceId) => {
  try {
    const docRef = doc(db, 'resources', resourceId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Resource not found' };
    }
  } catch (error) {
    console.error('Get resource error:', error);
    return { success: false, error: error.message };
  }
};

// Get all resources
export const getAllResources = async () => {
  try {
    const q = query(collection(db, 'resources'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const resources = [];
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: resources };
  } catch (error) {
    console.error('Get all resources error:', error);
    return { success: false, error: error.message };
  }
};

// Real-time listener for resources
export const subscribeToResources = (callback) => {
  const q = query(collection(db, 'resources'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const resources = [];
    snapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() });
    });
    callback(resources);
  });
}; 