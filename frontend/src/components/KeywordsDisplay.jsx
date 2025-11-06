import { useState, useEffect } from 'react';

const KeywordsDisplay = ({ keywords }) => {
  const [displayedKeywords, setDisplayedKeywords] = useState([]);

  useEffect(() => {
    if (!keywords || keywords.length === 0) {
      setDisplayedKeywords([]);
      return;
    }

    // Animate keywords appearing one by one
    setDisplayedKeywords([]);
    keywords.forEach((keyword, index) => {
      setTimeout(() => {
        setDisplayedKeywords(prev => [...prev, keyword]);
      }, index * 200); // 200ms delay between each keyword
    });
  }, [keywords]);

  return (
    <div className="keywords-display">
      {displayedKeywords.map((keyword, idx) => (
        <div
          key={`${keyword}-${idx}`}
          className="keyword-tag"
          style={{
            animationDelay: `${idx * 0.1}s`
          }}
        >
          {keyword}
        </div>
      ))}
    </div>
  );
};

export default KeywordsDisplay;