

import React, { useState, useEffect } from 'react';

const EmotionDisplay = ({ sentimentData }) => {
  const [displayData, setDisplayData] = useState({
    keywords: [],
    sentiment: 'neutral',
    mood: 'calm',
    score: 0
  });

  // Map sentiment scores to mood descriptions
  const getMood = (sentiment, score) => {
    if (sentiment === 'positive') {
      if (score > 80) return 'ecstatic';
      if (score > 60) return 'joyful';
      if (score > 40) return 'happy';
      return 'content';
    } else if (sentiment === 'negative') {
      if (score < 20) return 'distressed';
      if (score < 40) return 'sad';
      if (score < 60) return 'melancholic';
      return 'pensive';
    }
    return 'calm';
  };

  useEffect(() => {
    if (sentimentData) {
      setDisplayData({
        keywords: sentimentData.keywords || [],
        sentiment: sentimentData.sentiment || 'neutral',
        mood: sentimentData.mood || getMood(sentimentData.sentiment, sentimentData.score),
        score: sentimentData.score || 0
      });
    }
  }, [sentimentData]);

  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'positive': return 'linear-gradient(135deg, #00ff88, #00ffaa)';
      case 'negative': return 'linear-gradient(135deg, #6b46c1, #9333ea)';
      default: return 'linear-gradient(135deg, #0ea5e9, #06b6d4)';
    }
  };

  const getMoodEmoji = (mood) => {
    const moodEmojis = {
      'ecstatic': '🤩',
      'joyful': '😄',
      'happy': '😊',
      'content': '🙂',
      'calm': '😌',
      'pensive': '😔',
      'melancholic': '😢',
      'sad': '😞',
      'distressed': '😰'
    };
    return moodEmojis[mood] || '😐';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '20px',
      minWidth: '280px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      animation: 'slideIn 0.5s ease-out'
    }}>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Emotion Header */}
      <div style={{
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{
          color: '#fff',
          margin: '0 0 10px 0',
          fontSize: '18px',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          opacity: 0.9
        }}>Emotion Analysis</h3>
        
        {/* Mood Emoji */}
        <div style={{
          fontSize: '48px',
          marginBottom: '10px',
          animation: 'pulse 2s infinite'
        }}>
          {getMoodEmoji(displayData.mood)}
        </div>
      </div>

      {/* Sentiment Indicator */}
      <div style={{
        background: getSentimentColor(displayData.sentiment),
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '15px',
        boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>Sentiment</span>
          <span style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
            textTransform: 'capitalize'
          }}>{displayData.sentiment}</span>
        </div>
      </div>

      {/* Mood Display */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '12px',
        marginBottom: '15px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'fadeIn 0.7s ease-out'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>Mood</span>
          <span style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
            textTransform: 'capitalize'
          }}>{displayData.mood}</span>
        </div>
      </div>

      {/* Score Bar */}
      <div style={{
        marginBottom: '15px',
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '5px'
        }}>
          <span style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>Intensity</span>
          <span style={{
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>{displayData.score}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${displayData.score}%`,
            height: '100%',
            background: getSentimentColor(displayData.sentiment),
            transition: 'width 0.5s ease-out',
            boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
          }} />
        </div>
      </div>

      {/* Keywords */}
      {displayData.keywords.length > 0 && (
        <div style={{
          animation: 'fadeIn 0.9s ease-out'
        }}>
          <h4 style={{
            color: 'rgba(255, 255, 255, 0.7)',
            margin: '0 0 10px 0',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>Keywords Detected</h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {displayData.keywords.slice(0, 5).map((keyword, index) => (
              <span
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`,
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div style={{
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#00ff88',
          animation: 'pulse 2s infinite',
          boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
        }} />
        <span style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>Live Analysis</span>
      </div>
    </div>
  );
};

// Export ONLY the EmotionDisplay component, not the example App
export default EmotionDisplay;