import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = '' }) => {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className="loading-spinner" role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner; 