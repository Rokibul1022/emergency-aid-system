import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

const AppContext = createContext();

const initialState = {
  isOnline: navigator.onLine,
  notifications: [],
  alerts: [],
  isLoading: false,
  currentLocation: null,
  panicMode: false,
  theme: 'light',
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          (notification) => notification.id !== action.payload
        ),
      };
    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [...state.alerts, action.payload],
      };
    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert.id !== action.payload),
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
      };
    case 'SET_PANIC_MODE':
      return {
        ...state,
        panicMode: action.payload,
      };
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [manualLocationPrompt, setManualLocationPrompt] = React.useState(false);
  const [manualLat, setManualLat] = React.useState('');
  const [manualLng, setManualLng] = React.useState('');
  const { user, updateUser } = useAuth();
  const notificationIdCounter = React.useRef(0); // For unique notification IDs

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: Date.now(),
          type: 'success',
          message: 'You are back online',
          duration: 3000,
        },
      });
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          id: Date.now(),
          type: 'warning',
          message: 'You are offline. Some features may be limited.',
          duration: 5000,
        },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-remove notifications after duration
  useEffect(() => {
    const timers = state.notifications
      .filter((notification) => notification.duration)
      .map((notification) =>
        setTimeout(() => {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
        }, notification.duration)
      );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [state.notifications]);

  const addNotification = (message, type = 'info', duration = 5000) => {
    notificationIdCounter.current += 1;
    const notification = {
      id: `${Date.now()}-${notificationIdCounter.current}`, // More unique ID
      message,
      type,
      duration,
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  const removeNotification = (id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const addAlert = (message, type = 'info') => {
    notificationIdCounter.current += 1;
    const alert = {
      id: `${Date.now()}-${notificationIdCounter.current}`, // More unique ID
      message,
      type,
    };
    dispatch({ type: 'ADD_ALERT', payload: alert });
  };

  const removeAlert = (id) => {
    dispatch({ type: 'REMOVE_ALERT', payload: id });
  };

  const setLoading = (isLoading) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  };

  const setLocation = (location) => {
    dispatch({ type: 'SET_LOCATION', payload: location });
    // Persist location to Firestore for the current user
    if (user && location) {
      // Only save lat, lng, and address fields
      const { lat, lng, address } = location;
      updateUser({ location: { lat, lng, address } });
    }
  };

  const setPanicMode = (panicMode) => {
    dispatch({ type: 'SET_PANIC_MODE', payload: panicMode });
  };

  const setTheme = (theme) => {
    dispatch({ type: 'SET_THEME', payload: theme });
    localStorage.setItem('emergency_aid_theme', theme);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setManualLocationPrompt(true);
      return Promise.reject('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(location);
          resolve(location);
        },
        (error) => {
          // If location fails, prompt for manual entry without notification
          setManualLocationPrompt(true);
          console.log('Location error:', error.message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  // Add geocoding function
  const GEOCODE_API_KEY = '68874225cd188561912213mou8a0749'; // User's API key
  const GEOCODE_API = 'https://geocode.maps.co/search';

  const geocodeAddress = async (address) => {
    if (!address) return null;
    try {
      const url = `${GEOCODE_API}?q=${encodeURIComponent(address)}&api_key=${GEOCODE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        return {
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: display_name || address
        };
      }
      return null;
    } catch (e) {
      console.error('Geocoding error:', e);
      return null;
    }
  };

  // Allow manual location entry (address or lat/lng)
  const setManualLocation = async (lat, lng, address) => {
    let location = null;
    if (address && (!lat || !lng)) {
      // Geocode address
      location = await geocodeAddress(address);
      if (!location) {
        addNotification('Could not find location for this address.', 'error');
        return false;
      }
    } else if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
      location = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: address || '',
        accuracy: null,
        timestamp: Date.now(),
        manual: true
      };
    } else {
      addNotification('Please enter a valid address or coordinates.', 'error');
      return false;
    }
    setLocation(location);
    setManualLocationPrompt(false);
    setManualLat('');
    setManualLng('');
    return true;
  };

  const value = {
    ...state,
    addNotification,
    removeNotification,
    addAlert,
    removeAlert,
    setLoading,
    setLocation,
    setManualLocation,
    setPanicMode,
    setTheme,
    getCurrentLocation,
    geocodeAddress,
    manualLocationPrompt,
    setManualLocationPrompt,
    manualLat,
    setManualLat,
    manualLng,
    setManualLng,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 