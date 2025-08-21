import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import {
  forceCreateUserDocument,
  getCurrentUserData,
  onAuthStateChangedListener,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
  updateUserProfile,
  USER_ROLES
} from '../firebase/auth';

// Factory class for creating user data based on role
class UserFactory {
  static createUserData(user, role, additionalData = {}) {
    const baseUserData = {
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      email: user.email,
      photoURL: user.photoURL || null,
      role,
      createdAt: new Date(),
      verified: false,
      phone: additionalData.phone || ''
    };

    switch (role) {
      case USER_ROLES.REQUESTER:
        return {
          ...baseUserData,
          emergencyRequests: [],
          preferences: {
            notifications: true,
            language: 'en'
          }
        };
      case USER_ROLES.VOLUNTEER:
        return {
          ...baseUserData,
          availability: {
            isAvailable: true,
            lastUpdated: new Date()
          },
          assignedRequests: [],
          skills: []
        };
      case USER_ROLES.ADMIN:
        return {
          ...baseUserData,
          adminPrivileges: {
            canManageUsers: true,
            canManageRequests: true,
            canViewReports: true
          }
        };
      default:
        throw new Error(`Unsupported role: ${role}`);
    }
  }
}

const AuthContext = createContext();

const initialState = {
  user: null,
  userData: null,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (user) => {
      console.log('Auth state changed - User:', user?.uid);
      
      if (authProcessed && state.user?.uid === user?.uid) {
        console.log('Auth already processed for this user, skipping');
        return;
      }
      
      if (user) {
        try {
          let userData = await getCurrentUserData(user.uid);
          
          if (userData && userData.role) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, userData },
            });
            setAuthProcessed(true);
          } else {
            console.log('No role found, creating user document with requester role');
            
            try {
              const basicUserData = UserFactory.createUserData(user, USER_ROLES.REQUESTER);
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, userData: basicUserData },
              });
              
              try {
                await forceCreateUserDocument(user, USER_ROLES.REQUESTER, basicUserData);
                console.log('User document created successfully in background');
              } catch (createError) {
                console.error('Background user document creation failed:', createError);
              }
            } catch (error) {
              console.error('Error in auth flow:', error);
              const basicUserData = UserFactory.createUserData(user, USER_ROLES.REQUESTER);
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
        userData = UserFactory.createUserData(result.user, role, { phone });
        await updateUserProfile(result.user.uid, userData);
        userData = await getCurrentUserData(result.user.uid);
      }
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: result.user, userData },
      });
      
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
        userData = UserFactory.createUserData(user, USER_ROLES.REQUESTER);
        await updateUserProfile(user.uid, userData);
        userData = await getCurrentUserData(user.uid);
      }
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, userData },
      });
      
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
      
      if (!userData) {
        userData = UserFactory.createUserData(user, role);
        await updateUserProfile(user.uid, userData);
        userData = await getCurrentUserData(user.uid);
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

  const filterUndefined = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const filtered = {};
    for (const key in obj) {
      if (obj[key] === undefined) continue;
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        filtered[key] = filterUndefined(obj[key]);
      } else {
        filtered[key] = obj[key];
      }
    }
    return filtered;
  };

  const updateUser = async (updates) => {
    if (!state.user) return;
    try {
      const safeUpdates = filterUndefined(updates);
      await updateUserProfile(state.user.uid, safeUpdates);
      dispatch({ type: 'UPDATE_USER_DATA', payload: safeUpdates });
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
