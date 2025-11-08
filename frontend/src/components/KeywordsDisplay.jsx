// frontend/src/components/KeywordsDisplay.jsx
import React, { useState, useEffect } from 'react';
import './KeywordsDisplay.css';

const KeywordsDisplay = ({ keywords }) => {
  const [displayedKeywords, setDisplayedKeywords] = useState([]);
  const [animatingKeywords, setAnimatingKeywords] = useState([]);

  useEffect(() => {
    if (!keywords || keywords.length === 0) {
      // Fade out existing keywords
      setAnimatingKeywords(displayedKeywords.map(k => ({ ...k, fadeOut: true })));
      setTimeout(() => {
        setDisplayedKeywords([]);
        setAnimatingKeywords([]);
      }, 500);
      return;
    }

    // Add new keywords with staggered animation
    const newKeywords = keywords.map((keyword, index) => ({
      text: keyword,
      id: `${keyword}-${Date.now()}-${index}`,
      delay: index * 150, // Stagger by 150ms
      fadeOut: false
    }));

    setDisplayedKeywords(newKeywords);
    setAnimatingKeywords(newKeywords);
  }, [keywords]);

  return (
    <div className="keywords-container">
      <div className="keywords-header">
        <span className="keywords-label">Key Topics</span>
        <div className="keywords-pulse"></div>
      </div>
      
      <div className="keywords-cloud">
        {animatingKeywords.map((keyword) => (
          <div
            key={keyword.id}
            className={`keyword-tag ${keyword.fadeOut ? 'fade-out' : 'fade-in'}`}
            style={{
              animationDelay: `${keyword.delay}ms`,
              '--random-x': `${Math.random() * 20 - 10}px`,
              '--random-y': `${Math.random() * 20 - 10}px`,
            }}
          >
            <span className="keyword-text">{keyword.text}</span>
            <div className="keyword-glow"></div>
          </div>
        ))}
      </div>
      
      {displayedKeywords.length === 0 && (
        <div className="keywords-empty">
          <span>Listening for topics...</span>
        </div>
      )}
    </div>
  );
};

export default KeywordsDisplay;