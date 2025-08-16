import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signInWithGoogle, 
  signOutUser, 
  getCurrentUserData, 
  updateUserProfile,
  onAuthStateChangedListener,
  forceCreateUserDocument,
  USER_ROLES 
} from '../firebase/auth';
import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

const initialState = {
  user: null,
  userData: null, // Firestore user data
  isAuthenticated: false,
  isLoading: true,
  role: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        userData: action.payload.userData,
        isAuthenticated: true,
        isLoading: false,
        role: action.payload.userData?.role || null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        userData: null,
        isAuthenticated: false,
        isLoading: false,
        role: null,
      };
    case 'UPDATE_USER_DATA':
      return {
        ...state,
        userData: { ...state.userData, ...action.payload },
        role: action.payload.role || state.role,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        userData: null,
        isAuthenticated: false,
        isLoading: false,
        role: null,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [authProcessed, setAuthProcessed] = useState(false);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (user) => {
      console.log('Auth state changed - User:', user?.uid);
      
      // Prevent multiple auth processing
      if (authProcessed && state.user?.uid === user?.uid) {
        console.log('Auth already processed for this user, skipping');
        return;
      }
      
      if (user) {
        try {
          // Get user data from Firestore
          let userData = await getCurrentUserData(user.uid);
          
          // Simplified auth flow - always dispatch success if user exists
          if (userData && userData.role) {
            // User exists and has a role
                          dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, userData },
              });
              setAuthProcessed(true);
            } else {
            // User exists but no role, or user doesn't exist
            try {
              console.log('No role found, creating user document with requester role');
              
              // Create basic user data first
              const basicUserData = {
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email,
                photoURL: user.photoURL || null,
                role: USER_ROLES.REQUESTER,
                createdAt: new Date(),
                verified: false,
                phone: ''
              };
              
              // Dispatch success immediately with basic data
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, userData: basicUserData },
              });
              
              // Then try to create/update the document in background
              try {
                await forceCreateUserDocument(user, USER_ROLES.REQUESTER);
                console.log('User document created successfully in background');
              } catch (createError) {
                console.error('Background user document creation failed:', createError);
                // Don't fail auth, just log the error
              }
              
            } catch (error) {
              console.error('Error in auth flow:', error);
              // Still dispatch success to prevent logout
              const basicUserData = {
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email,
                photoURL: user.photoURL || null,
                role: USER_ROLES.REQUESTER,
                createdAt: new Date(),
                verified: false,
                phone: ''
              };
              
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, userData: basicUserData },
              });
            }
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          dispatch({ type: 'AUTH_FAILURE' });
        }
      } else {
        dispatch({ type: 'AUTH_FAILURE' });
      }
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, displayName, role = USER_ROLES.REQUESTER, phone = '') => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await signUpWithEmail(email, password, displayName, role, { phone });
      let userData = await getCurrentUserData(result.user.uid);
      if (!userData) {
        await updateUserProfile(result.user.uid, { role, phone });
        userData = await getCurrentUserData(result.user.uid);
      }
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.user, userData },
      });
      // Refetch userData to ensure latest info
      setTimeout(async () => {
        const refreshedUserData = await getCurrentUserData(result.user.uid);
        if (refreshedUserData) {
          dispatch({ type: 'UPDATE_USER_DATA', payload: refreshedUserData });
        }
      }, 500);
      return { success: true };
    } catch (error) {
      console.error('Signup failed:', error);
      dispatch({ type: 'AUTH_FAILURE' });
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const user = await signInWithEmail(email, password);
      let userData = await getCurrentUserData(user.uid);
      if (!userData) {
        userData = {
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email,
          photoURL: user.photoURL || null,
          role: USER_ROLES.REQUESTER,
          createdAt: new Date(),
          verified: false,
          phone: ''
        };
      }
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, userData },
      });
      // Refetch userData to ensure latest info
      setTimeout(async () => {
        const refreshedUserData = await getCurrentUserData(user.uid);
        if (refreshedUserData) {
          dispatch({ type: 'UPDATE_USER_DATA', payload: refreshedUserData });
        }
      }, 500);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      dispatch({ type: 'AUTH_FAILURE' });
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async (role = USER_ROLES.REQUESTER) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const user = await signInWithGoogle(role);
      let userData = await getCurrentUserData(user.uid);
      
      // If no userData, create basic userData
      if (!userData) {
        userData = {
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email,
          photoURL: user.photoURL || null,
          role: USER_ROLES.REQUESTER,
          createdAt: new Date(),
          verified: false,
          phone: ''
        };
      }
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, userData },
      });
      
      return { success: true };
    } catch (error) {
      console.error('Google login failed:', error);
      dispatch({ type: 'AUTH_FAILURE' });
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      dispatch({ type: 'LOGOUT' });
      setAuthProcessed(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateUser = async (updates) => {
    if (!state.user) return;
    
    try {
      await updateUserProfile(state.user.uid, updates);
      dispatch({ type: 'UPDATE_USER_DATA', payload: updates });
      return { success: true };
    } catch (error) {
      console.error('Update user failed:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    ...state,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    USER_ROLES,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 