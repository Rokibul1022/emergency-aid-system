import React from 'react';

export default function RequestLocationMap({ latitude, longitude, panic, popupText }) {
  if (!latitude || !longitude) {
    return (
      <div style={{ 
        height: 180, 
        width: '100%', 
        borderRadius: 12, 
        margin: '8px 0',
        backgroundColor: '#f7fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e53e3e',
        border: '1px solid #e2e8f0'
      }}>
        No location available
      </div>
    );
  }

  return (
    <div style={{ 
      height: 180, 
      width: '100%', 
      borderRadius: 12, 
      margin: '8px 0',
      backgroundColor: '#f7fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#2d3748',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>
          {panic ? '🚨' : '📍'}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
          {popupText || (panic ? 'Panic Alert Location' : 'Request Location')}
        </div>
        <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '8px' }}>
          Latitude: {latitude.toFixed(6)}
        </div>
        <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '12px' }}>
          Longitude: {longitude.toFixed(6)}
        </div>
        <div style={{ fontSize: '12px', color: '#718096' }}>
          Click to view on map
        </div>
      </div>
    </div>
  );
} 