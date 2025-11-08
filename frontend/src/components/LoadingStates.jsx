// frontend/src/components/LoadingStates.jsx
import React from 'react';
import './LoadingStates.css';

export const ConnectionStatus = ({ status }) => {
  const getStatusMessage = () => {
    switch(status) {
      case 'connecting':
        return 'Connecting to transcription service...';
      case 'reconnecting':
        return 'Connection lost. Reconnecting...';
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection failed';
      default:
        return '';
    }
  };

  const getStatusClass = () => {
    switch(status) {
      case 'connected':
        return 'status-connected';
      case 'error':
        return 'status-error';
      case 'connecting':
      case 'reconnecting':
        return 'status-connecting';
      default:
        return '';
    }
  };

  if (!status || status === 'disconnected') return null;

  return (
    <div className={`connection-status ${getStatusClass()}`}>
      {(status === 'connecting' || status === 'reconnecting') && (
        <div className="status-spinner"></div>
      )}
      <span className="status-text">{getStatusMessage()}</span>
    </div>
  );
};

export const ApiLoadingIndicator = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="api-loading">
      <div className="loading-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <span>Analyzing sentiment...</span>
    </div>
  );
};

export const ProcessingOverlay = ({ show, message = 'Processing...' }) => {
  if (!show) return null;

  return (
    <div className="processing-overlay">
      <div className="processing-content">
        <div className="processing-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="processing-message">{message}</p>
      </div>
    </div>
  );
};

export default { ConnectionStatus, ApiLoadingIndicator, ProcessingOverlay };