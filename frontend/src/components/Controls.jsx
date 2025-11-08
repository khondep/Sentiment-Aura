// frontend/src/components/Controls.jsx
import React from 'react';
import './Controls.css';

const Controls = ({ isRecording, onToggleRecording }) => {
  return (
    <div className="controls-container">
      <button 
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={onToggleRecording}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <div className="record-icon" />
      </button>
      
      <div className="status-text">
        {isRecording ? 'Recording' : 'Click to Start'}
      </div>
    </div>
  );
};

export default Controls;