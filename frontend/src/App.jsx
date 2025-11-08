import { useState, useEffect, useRef } from 'react';
import { createClient } from '@deepgram/sdk';
import axios from 'axios';
import AuraVisualization from './components/AuraVisualization';
import TranscriptDisplay from './components/TranscriptDisplay';
import KeywordsDisplay from './components/KeywordsDisplay';
import Controls from './components/Controls';
import { ConnectionStatus, ApiLoadingIndicator } from './components/LoadingStates';  
import ApiRequestManager from './utils/ApiRequestManager'; 
import EmotionDisplay from './components/EmotionDisplay';
import VoiceToneAnalyzer from './components/VoiceToneAnalyzer';
import './App.css';

// Access environment variables from root .env (must be prefixed with VITE_)
const config = {
  // Backend configuration
  backendUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // Deepgram configuration
  deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY,
  
  // AI API Keys (optional - for frontend use if needed)
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY,
  anthropicApiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  
  // Other configuration
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000',
  publicApiKey: import.meta.env.VITE_PUBLIC_API_KEY,
  
  // Development flags
  isDevelopment: import.meta.env.NODE_ENV === 'development',
  isDebug: import.meta.env.DEBUG === 'true'
};

// Initialize API Request Manager with the backend URL
const apiManager = new ApiRequestManager(config.backendUrl, {
  timeout: 10000,
  retryAttempts: 3,
  maxConcurrent: 2
});

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [emotionData, setEmotionData] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);

  const mediaRecorderRef = useRef(null);
  const deepgramRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Check configuration on mount
  useEffect(() => {
    console.log('🔧 App Configuration:', {
      backendUrl: config.backendUrl,
      hasDeepgramKey: !!config.deepgramApiKey,
      hasOpenAIKey: !!config.openaiApiKey,
      hasAnthropicKey: !!config.anthropicApiKey,
      hasGoogleKey: !!config.googleApiKey,
      isDevelopment: config.isDevelopment
    });
    
    // Check backend connection
    checkBackendConnection();
    
    // Validate Deepgram API key
    if (!config.deepgramApiKey) {
      setError('⚠️ Deepgram API key is missing. Please add VITE_DEEPGRAM_API_KEY to your .env file');
    } else if (config.deepgramApiKey.includes('your_') || config.deepgramApiKey.includes('REPLACE')) {
      setError('⚠️ Please replace the placeholder Deepgram API key with your actual key in .env');
    }
  }, []);

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const response = await axios.get(`${config.backendUrl}/api/config`);
      setBackendStatus(response.data);
      console.log('✅ Backend connected:', response.data);
      
      // Check which AI provider is configured
      if (response.data.providers_configured) {
        const configured = Object.entries(response.data.providers_configured)
          .filter(([_, value]) => value)
          .map(([key, _]) => key);
        
        if (configured.length === 0) {
          setError('⚠️ No AI provider API keys configured. Please check your .env file');
        } else {
          console.log('✅ AI Providers configured:', configured.join(', '));
        }
      }
    } catch (err) {
      console.error('❌ Backend connection failed:', err);
      setError('❌ Cannot connect to backend. Please ensure the backend server is running on ' + config.backendUrl);
    }
  };

  // Process text through backend with error handling
  const processText = async (text) => {
    if (!text || text.trim().length < 3) return;
    
    setIsAnalyzing(true);
    try {
      const response = await apiManager.post('/process_text', { text });
      
      console.log('Sentiment response:', response);
      
      // Handle both old format (object with type) and new format (string)
      let sentimentType = response.sentiment;
      let sentimentScore = response.score;
      
      // Check if sentiment is an object (old format)
      if (typeof response.sentiment === 'object' && response.sentiment !== null) {
        sentimentType = response.sentiment.type || 'neutral';
        sentimentScore = (response.sentiment.score || 0.5) * 100; // Convert 0-1 to 0-100
      }
      
      setSentiment(sentimentType);
      setKeywords(response.keywords || []);
      
      // Set emotion data for the display component
      setEmotionData({
        keywords: response.keywords || [],
        sentiment: sentimentType,
        score: sentimentScore || 50,
        mood: response.mood || calculateMood(sentimentType, sentimentScore || 50),
        text: text
      });
      
      // Clear any previous errors on success
      if (error && error.includes('backend')) {
        setError(null);
      }
      
    } catch (error) {
      console.error('Error processing text:', error);
      
      // User-friendly error messages
      let errorMessage = 'Failed to analyze sentiment';
      
      if (error.message) {
        if (error.message.includes('timeout')) {
          errorMessage = '⏱️ AI service is responding slowly. Please wait...';
        } else if (error.message.includes('No response')) {
          errorMessage = '❌ Backend server is not responding. Please ensure it\'s running on ' + config.backendUrl;
        } else if (error.status === 429) {
          errorMessage = '⚠️ Too many requests. Please slow down.';
        } else if (error.status === 500) {
          errorMessage = '❌ Backend error. Check that AI API keys are configured in .env';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate mood based on sentiment and score (fallback for old backend)
  const calculateMood = (sentiment, score) => {
    if (sentiment === 'positive') {
      if (score > 80) return 'ecstatic';
      if (score > 60) return 'joyful';
      if (score > 40) return 'happy';
      return 'content';
    } else if (sentiment === 'negative') {
      if (score > 80) return 'distressed';
      if (score > 60) return 'sad';
      if (score > 40) return 'melancholic';
      return 'pensive';
    }
    return 'calm';
  };

  // Reconnect to Deepgram with exponential backoff
  const reconnectDeepgram = () => {
    if (reconnectAttemptsRef.current >= 5) {
      setConnectionStatus('error');
      setError('Unable to connect to transcription service after multiple attempts');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
    
    console.log(`Reconnecting to Deepgram in ${delay}ms (attempt ${reconnectAttemptsRef.current}/5)`);
    setConnectionStatus('reconnecting');

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isRecording) {
        startRecording();
      }
    }, delay);
  };

  // Start recording with enhanced error handling
  const startRecording = async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      
      // Check if Deepgram API key exists and is valid
      if (!config.deepgramApiKey) {
        setError('❌ Deepgram API key is missing. Please add VITE_DEEPGRAM_API_KEY to your .env file');
        setConnectionStatus('error');
        return;
      }
      
      if (config.deepgramApiKey.includes('your_') || config.deepgramApiKey.includes('REPLACE')) {
        setError('❌ Please replace the placeholder Deepgram API key with your actual key');
        setConnectionStatus('error');
        return;
      }

      // Get microphone access
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('✅ Microphone access granted');
      streamRef.current = stream;

      // Initialize Deepgram client
      console.log('🔊 Initializing Deepgram client...');
      const deepgram = createClient(config.deepgramApiKey);
      
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
        console.log('✅ Deepgram connection opened');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Hide connected status after 3 seconds
        setTimeout(() => {
          if (connectionStatus === 'connected') {
            setConnectionStatus('disconnected');
          }
        }, 3000);
        
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
        console.log('🎙️ Recording started');
      });

      connection.on('Results', (data) => {
        const transcript_text = data.channel.alternatives[0].transcript;
        
        if (transcript_text && transcript_text.trim() !== '') {
          console.log('📝 Transcript received:', transcript_text);
          // Only process final results
          if (data.is_final) {
            setTranscript(prev => [...prev, transcript_text]);
            // Send to backend for sentiment analysis
            processText(transcript_text);
          }
        }
      });

      connection.on('error', (err) => {
        console.error('❌ Deepgram error:', err);
        
        if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
          setError('❌ Invalid Deepgram API key. Please check VITE_DEEPGRAM_API_KEY in your .env file');
          setConnectionStatus('error');
          stopRecording();
        } else {
          setError('⚠️ Transcription service interrupted. Attempting to reconnect...');
          reconnectDeepgram();
        }
      });

      connection.on('close', (event) => {
        console.log('Deepgram connection closed');
        
        // If not intentionally closed and still recording, try to reconnect
        if (isRecording && event.code !== 1000) {
          reconnectDeepgram();
        }
      });

      setIsRecording(true);

    } catch (err) {
      console.error('❌ Error starting recording:', err);
      setConnectionStatus('error');
      
      // More specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('🎤 Microphone permission denied. Please allow microphone access and try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('🎤 No microphone found. Please connect a microphone and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('🎤 Microphone is already in use by another application.');
      } else {
        setError(`❌ Failed to start recording: ${err.message}`);
      }
      
      setTimeout(() => setError(null), 5000);
    }
  };

  // Stop recording with cleanup
  const stopRecording = () => {
    console.log('🛑 Stopping recording...');
    
    // Clear any reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
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
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
    console.log('✅ Recording stopped');
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      apiManager.cancelAll();
    };
  }, []);

  // Debug sentiment changes
  useEffect(() => {
    if (config.isDebug) {
      console.log('🎨 Sentiment changed to:', sentiment);
      console.log('🎨 Background style:', getBackgroundStyle());
    }
  }, [sentiment]);

  // Get dynamic background style based on sentiment
  const getBackgroundStyle = () => {
    let sentimentType = sentiment;
    
    // Handle object format for backward compatibility
    if (typeof sentiment === 'object' && sentiment !== null) {
      sentimentType = sentiment.type;
    }
    
    if (!sentimentType) {
      return {
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      };
    }

    switch(sentimentType.toLowerCase()) {
      case 'positive':
        // Blue gradient for positive
        return {
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)'
        };
      case 'negative':
        // Warm hues (orange/red) for negative
        return {
          background: 'linear-gradient(135deg, #1a0f0f 0%, #991b1b 50%, #dc2626 100%)'
        };
      case 'neutral':
      default:
        // Purple gradient for neutral
        return {
          background: 'linear-gradient(135deg, #1a0f1f 0%, #581c87 50%, #7c3aed 100%)'
        };
    }
  };

  return (
    <div className="app">
      {/* Dynamic Background Layer */}
      <div className="dynamic-background" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        ...getBackgroundStyle(),
        transition: 'background 2s ease-in-out'
      }} />
      
      {/* Background Visualization */}
      <AuraVisualization sentiment={sentiment} keywords={keywords} />
      
      {/* Project Title */}
      <div className="project-title">
        <h1 className="title-text">SENTIMENT AURA</h1>
        <div className="title-subtitle">Real-Time Voice Emotion Visualization</div>
        {backendStatus && (
          <div className="title-status">
            AI Provider: {backendStatus.ai_provider?.toUpperCase() || 'Not configured'}
          </div>
        )}
      </div>
      
      {/* Connection Status Indicator */}
      <ConnectionStatus status={connectionStatus} />
      
      {/* Voice Tone Analyzer - Shows when recording */}
      <VoiceToneAnalyzer 
        isRecording={isRecording} 
        stream={streamRef.current}
      />
      
      {/* Emotion Display Panel */}
      {emotionData && (
        <EmotionDisplay sentimentData={emotionData} />
      )}
      
      {/* Main Content Container */}
      <div className="content-wrapper">
        {/* Keywords Section */}
        <div className="keywords-section">
          <KeywordsDisplay keywords={keywords} />
        </div>
        
        {/* Transcript Section */}
        <div className="transcript-section">
          <TranscriptDisplay transcript={transcript} />
        </div>
        
        {/* Controls Section */}
        <div className="controls-section">
          <Controls 
            isRecording={isRecording} 
            onToggleRecording={toggleRecording} 
          />
        </div>
      </div>

      {/* API Loading Indicator */}
      <ApiLoadingIndicator isLoading={isAnalyzing} />

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Debug Panel - Only in development mode */}
      {config.isDevelopment && config.isDebug && (
        <div className="debug-panel" style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          maxWidth: '300px'
        }}>
          <h4>Debug Info</h4>
          <pre>{JSON.stringify({
            sentiment,
            keywords: keywords.slice(0, 3),
            transcriptCount: transcript.length,
            isRecording,
            connectionStatus,
            backendUrl: config.backendUrl,
            provider: backendStatus?.ai_provider
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;