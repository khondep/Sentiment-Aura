import { useState, useEffect, useRef } from 'react';
import { createClient } from '@deepgram/sdk';
import axios from 'axios';
import AuraVisualization from './components/AuraVisualization';
import TranscriptDisplay from './components/TranscriptDisplay';
import KeywordsDisplay from './components/KeywordsDisplay';
import Controls from './components/Controls';
import './App.css';

// const BACKEND_URL = 'http://localhost:8000';
// const DEEPGRAM_API_KEY = '4c74b86c060ba035eb7d7ff70f68e058175ea5e4'; // Replace with your Deepgram API key
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const deepgramRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  // Process text through backend
  const processText = async (text) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/process_text`, {
        text: text
      });
      
      setSentiment(response.data.sentiment);
      setKeywords(response.data.keywords);
    } catch (err) {
      console.error('Error processing text:', err);
      setError('Failed to analyze sentiment');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Initialize Deepgram client
      const deepgram = createClient(DEEPGRAM_API_KEY);
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true
      });

      deepgramRef.current = connection;

      // Handle Deepgram events
      connection.on('open', () => {
        console.log('Deepgram connection opened');
        
        // Create MediaRecorder to capture audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        });

        mediaRecorder.start(250); // Send data every 250ms
      });

      connection.on('Results', (data) => {
        const transcript_text = data.channel.alternatives[0].transcript;
        
        if (transcript_text && transcript_text.trim() !== '') {
          // Only process final results
          if (data.is_final) {
            setTranscript(prev => [...prev, transcript_text]);
            // Send to backend for sentiment analysis
            processText(transcript_text);
          }
        }
      });

      connection.on('error', (err) => {
        console.error('Deepgram error:', err);
        setError('Transcription error occurred');
        setTimeout(() => setError(null), 3000);
      });

      connection.on('close', () => {
        console.log('Deepgram connection closed');
      });

      setIsRecording(true);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (deepgramRef.current) {
      deepgramRef.current.finish();
      deepgramRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="app">
      <AuraVisualization sentiment={sentiment} keywords={keywords} />
      
      <KeywordsDisplay keywords={keywords} />
      
      <TranscriptDisplay transcript={transcript} />
      
      <Controls 
        isRecording={isRecording} 
        onToggleRecording={toggleRecording} 
      />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;