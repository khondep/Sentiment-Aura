import { useEffect, useRef } from 'react';

const TranscriptDisplay = ({ transcript }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div ref={scrollRef} className="transcript-display">
      {transcript.length === 0 ? (
        <div className="transcript-placeholder">
          Start speaking to see your words appear here...
        </div>
      ) : (
        transcript.map((line, idx) => (
          <div key={idx} className="transcript-line">
            {line}
          </div>
        ))
      )}
    </div>
  );
};

export default TranscriptDisplay;