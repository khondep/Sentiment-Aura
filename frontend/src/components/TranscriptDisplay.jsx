// frontend/src/components/TranscriptDisplay.jsx
import React, { useEffect, useRef } from 'react';
import './TranscriptDisplay.css';

const TranscriptDisplay = ({ transcript }) => {
  const contentRef = useRef(null);

  // Auto-scroll to bottom when new transcript is added
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="transcript-container">
      <div className="transcript-header">
        <span className="transcript-label">Live Transcript</span>
        <div className="transcript-status">
          <div className="listening-indicator">
            <div className="listening-dot"></div>
            <div className="listening-dot"></div>
            <div className="listening-dot"></div>
          </div>
        </div>
      </div>
      
      <div className="transcript-content" ref={contentRef}>
        {transcript.length > 0 ? (
          transcript.map((text, index) => (
            <div key={index} className="transcript-text">
              {text}
            </div>
          ))
        ) : (
          <div className="transcript-empty">
            Start speaking to see your words appear here...
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptDisplay;