import React, { useEffect, useRef, useState } from 'react';
import './VoiceToneAnalyzer.css';

const VoiceToneAnalyzer = ({ isRecording, stream }) => {
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(0);
  const [voiceEnergy, setVoiceEnergy] = useState(0);
  const [tonalQuality, setTonalQuality] = useState('neutral');
  const [confidence, setConfidence] = useState(0);
  
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const pitchHistoryRef = useRef([]);
  const volumeHistoryRef = useRef([]);
  const smoothedPitchRef = useRef(0);
  const smoothedVolumeRef = useRef(0);
  const voiceActivityRef = useRef([]);
  const silenceCountRef = useRef(0);

  // YIN Algorithm for more accurate pitch detection
  const detectPitchYIN = (buffer, sampleRate) => {
    const threshold = 0.1;
    const probabilityThreshold = 0.1;
    const bufferSize = buffer.length;
    const halfBufferSize = Math.floor(bufferSize / 2);
    
    // Step 1: Calculate difference function
    const yinBuffer = new Float32Array(halfBufferSize);
    let probability = 0;
    let tau;
    
    for (let t = 1; t < halfBufferSize; t++) {
      let sum = 0;
      for (let i = 0; i < halfBufferSize; i++) {
        const delta = buffer[i] - buffer[i + t];
        sum += delta * delta;
      }
      yinBuffer[t] = sum;
    }
    
    // Step 2: Cumulative mean normalized difference
    yinBuffer[0] = 1;
    let runningSum = yinBuffer[1];
    yinBuffer[1] = 1;
    
    for (let t = 2; t < halfBufferSize; t++) {
      runningSum += yinBuffer[t];
      yinBuffer[t] = yinBuffer[t] * t / runningSum;
    }
    
    // Step 3: Absolute threshold
    for (tau = 2; tau < halfBufferSize; tau++) {
      if (yinBuffer[tau] < threshold) {
        while (tau + 1 < halfBufferSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        probability = 1 - yinBuffer[tau];
        break;
      }
    }
    
    // Step 4: No pitch found
    if (tau === halfBufferSize || yinBuffer[tau] >= threshold) {
      return { pitch: -1, confidence: 0 };
    }
    
    // Step 5: Parabolic interpolation
    let x0 = tau - 1;
    let x2 = tau + 1;
    
    if (x0 < 1) x0 = 1;
    if (x2 >= halfBufferSize) x2 = halfBufferSize - 1;
    
    let y0 = yinBuffer[x0];
    let y1 = yinBuffer[tau];
    let y2 = yinBuffer[x2];
    
    const a = (y2 - 2 * y1 + y0) / 2;
    const b = (y2 - y0) / 2;
    
    let tauEstimate = tau;
    if (a !== 0) {
      tauEstimate = tau - b / (2 * a);
    }
    
    const pitch = sampleRate / tauEstimate;
    const confidence = probability > probabilityThreshold ? probability : 0;
    
    return { pitch, confidence };
  };

  // Improved volume calculation with A-weighting
  const calculateVolume = (buffer) => {
    // Apply A-weighting for perceptual loudness
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.abs(buffer[i]);
      sum += sample * sample;
      if (sample > peak) peak = sample;
    }
    
    const rms = Math.sqrt(sum / buffer.length);
    // Use a combination of RMS and peak for better perception
    const volume = rms * 0.7 + peak * 0.3;
    
    // Apply logarithmic scaling for more natural perception
    return Math.pow(Math.min(volume * 3, 1), 0.7);
  };

  // Voice Activity Detection (VAD)
  const detectVoiceActivity = (buffer, energy) => {
    // Calculate zero-crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < buffer.length; i++) {
      if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / buffer.length;
    
    // Voice has specific ZCR range (typically 0.02-0.1)
    const isVoiceZCR = zcr > 0.01 && zcr < 0.15;
    
    // Energy threshold
    const isVoiceEnergy = energy > 0.02;
    
    return isVoiceZCR && isVoiceEnergy;
  };

  // Calculate speaking rate with improved accuracy
  const calculateSpeakingRate = (isActive) => {
    const now = Date.now();
    
    // Add current state to history
    voiceActivityRef.current.push({ time: now, active: isActive });
    
    // Keep only last 5 seconds
    voiceActivityRef.current = voiceActivityRef.current.filter(
      entry => now - entry.time < 5000
    );
    
    if (voiceActivityRef.current.length < 2) return 0;
    
    // Calculate percentage of time speaking
    let speakingTime = 0;
    for (let i = 1; i < voiceActivityRef.current.length; i++) {
      if (voiceActivityRef.current[i - 1].active) {
        speakingTime += voiceActivityRef.current[i].time - voiceActivityRef.current[i - 1].time;
      }
    }
    
    const totalTime = now - voiceActivityRef.current[0].time;
    return Math.min((speakingTime / totalTime) * 100, 100);
  };

  // Smooth values to reduce jitter
  const smoothValue = (current, previous, factor = 0.3) => {
    return previous * (1 - factor) + current * factor;
  };

  // Analyze tonal quality with better accuracy
  const analyzeTonalQuality = (currentPitch, currentVolume, currentEnergy) => {
    if (pitchHistoryRef.current.length < 10) return 'neutral';
    
    // Calculate statistics
    const recentPitches = pitchHistoryRef.current.slice(-30);
    const avgPitch = recentPitches.reduce((a, b) => a + b, 0) / recentPitches.length;
    const pitchStdDev = Math.sqrt(
      recentPitches.reduce((sum, p) => sum + Math.pow(p - avgPitch, 2), 0) / recentPitches.length
    );
    
    const recentVolumes = volumeHistoryRef.current.slice(-30);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    
    // Coefficient of variation for pitch
    const pitchCV = avgPitch > 0 ? (pitchStdDev / avgPitch) * 100 : 0;
    
    // Determine quality based on multiple factors
    if (pitchCV > 25 && currentVolume > avgVolume * 1.2 && currentEnergy > 0.6) {
      return 'excited';
    } else if (currentPitch > avgPitch * 1.15 && currentEnergy > 0.5) {
      return 'energetic';
    } else if (currentPitch < avgPitch * 0.85 || currentVolume < avgVolume * 0.7) {
      return 'subdued';
    } else if (pitchCV < 5 && currentEnergy < 0.3) {
      return 'monotone';
    } else {
      return 'neutral';
    }
  };

  useEffect(() => {
    if (!isRecording || !stream) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // Set up Web Audio API with optimal settings
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const audioContext = audioContextRef.current;
    
    analyserRef.current = audioContext.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.85; // More smoothing
    
    // Add a low-pass filter to reduce high-frequency noise
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000; // Human voice typically below 3kHz
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(filter);
    filter.connect(analyserRef.current);
    
    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    let frameCount = 0;
    
    const analyze = () => {
      if (!analyserRef.current || !isRecording) return;
      
      frameCount++;
      
      analyserRef.current.getFloatTimeDomainData(dataArray);
      analyserRef.current.getByteFrequencyData(frequencyData);
      
      // Calculate volume with improved method
      const currentVolume = calculateVolume(dataArray);
      smoothedVolumeRef.current = smoothValue(currentVolume, smoothedVolumeRef.current, 0.2);
      setVolume(smoothedVolumeRef.current);
      
      // Keep volume history
      if (frameCount % 3 === 0) { // Reduce history update frequency
        volumeHistoryRef.current.push(smoothedVolumeRef.current);
        if (volumeHistoryRef.current.length > 100) {
          volumeHistoryRef.current.shift();
        }
      }
      
      // Voice Activity Detection
      const isVoiceActive = detectVoiceActivity(dataArray, smoothedVolumeRef.current);
      
      if (isVoiceActive) {
        silenceCountRef.current = 0;
        
        // Detect pitch only when voice is active
        const { pitch: detectedPitch, confidence: pitchConfidence } = detectPitchYIN(dataArray, audioContext.sampleRate);
        
        if (detectedPitch > 50 && detectedPitch < 600 && pitchConfidence > 0.5) {
          // Valid pitch range for human voice with confidence threshold
          smoothedPitchRef.current = smoothValue(detectedPitch, smoothedPitchRef.current || detectedPitch, 0.3);
          setPitch(smoothedPitchRef.current);
          setConfidence(pitchConfidence);
          
          if (frameCount % 3 === 0) {
            pitchHistoryRef.current.push(smoothedPitchRef.current);
            if (pitchHistoryRef.current.length > 100) {
              pitchHistoryRef.current.shift();
            }
          }
        }
      } else {
        silenceCountRef.current++;
        // Clear pitch after sustained silence
        if (silenceCountRef.current > 30) {
          setPitch(0);
          setConfidence(0);
        }
      }
      
      // Calculate voice energy with frequency bands
      const lowBand = frequencyData.slice(2, 10); // 85-340 Hz
      const midBand = frequencyData.slice(10, 40); // 340-1300 Hz
      const highBand = frequencyData.slice(40, 100); // 1300-3400 Hz
      
      const lowEnergy = lowBand.reduce((a, b) => a + b, 0) / (lowBand.length * 255);
      const midEnergy = midBand.reduce((a, b) => a + b, 0) / (midBand.length * 255);
      const highEnergy = highBand.reduce((a, b) => a + b, 0) / (highBand.length * 255);
      
      // Weighted energy (voice is primarily in mid frequencies)
      const totalEnergy = lowEnergy * 0.2 + midEnergy * 0.6 + highEnergy * 0.2;
      const smoothedEnergy = smoothValue(totalEnergy, voiceEnergy, 0.25);
      setVoiceEnergy(smoothedEnergy);
      
      // Calculate speaking rate
      if (frameCount % 5 === 0) { // Update less frequently
        const rate = calculateSpeakingRate(isVoiceActive);
        setSpeakingRate(smoothValue(rate, speakingRate, 0.15));
      }
      
      // Analyze tonal quality
      if (frameCount % 10 === 0 && pitchHistoryRef.current.length > 20) {
        const quality = analyzeTonalQuality(smoothedPitchRef.current, smoothedVolumeRef.current, smoothedEnergy);
        setTonalQuality(quality);
      }
      
      animationFrameRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isRecording, stream]);

  // Convert pitch to note name
  const pitchToNote = (frequency) => {
    if (frequency <= 0) return '--';
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const c0 = a4 * Math.pow(2, -4.75);
    
    if (frequency < c0 || frequency > c0 * Math.pow(2, 9)) {
      return '--'; // Out of reasonable range
    }
    
    const halfSteps = 12 * Math.log2(frequency / c0);
    const octave = Math.floor(halfSteps / 12);
    const noteIndex = Math.round(halfSteps % 12);
    return `${noteNames[noteIndex]}${octave}`;
  };

  // Get color based on metric value
  const getMetricColor = (value, type) => {
    if (type === 'pitch') {
      // Human voice pitch ranges
      if (pitch < 85) return '#3b82f6';  // Very low (bass)
      if (pitch < 165) return '#10b981'; // Low (baritone/alto)
      if (pitch < 255) return '#f59e0b'; // Medium (tenor/mezzo)
      return '#ef4444'; // High (soprano)
    }
    
    if (type === 'confidence') {
      if (value < 0.3) return '#ef4444';
      if (value < 0.6) return '#f59e0b';
      if (value < 0.8) return '#10b981';
      return '#3b82f6';
    }
    
    const percentage = value * 100;
    if (percentage < 30) return '#3b82f6';
    if (percentage < 60) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={`voice-tone-analyzer ${isRecording ? 'active' : ''}`}>
      <h3 className="analyzer-title">Voice Analysis</h3>
      
      {/* Pitch Meter with Confidence */}
      <div className="metric-container">
        <div className="metric-header">
          <span className="metric-label">Pitch</span>
          <span className="metric-value">{pitch > 0 ? `${pitch.toFixed(0)} Hz` : '--'}</span>
          <span className="metric-note">{pitchToNote(pitch)}</span>
        </div>
        <div className="metric-bar-container">
          <div 
            className="metric-bar pitch-bar"
            style={{
              width: `${Math.min((pitch / 400) * 100, 100)}%`,
              backgroundColor: getMetricColor(pitch / 400, 'pitch'),
              boxShadow: `0 0 20px ${getMetricColor(pitch / 400, 'pitch')}40`,
              opacity: 0.5 + (confidence * 0.5)
            }}
          />
        </div>
        {confidence > 0 && (
          <div className="confidence-indicator" style={{
            fontSize: '10px',
            color: getMetricColor(confidence, 'confidence'),
            marginTop: '2px'
          }}>
            Confidence: {(confidence * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Volume Meter */}
      <div className="metric-container">
        <div className="metric-header">
          <span className="metric-label">Volume</span>
          <span className="metric-value">{(volume * 100).toFixed(0)}%</span>
        </div>
        <div className="metric-bar-container">
          <div 
            className="metric-bar volume-bar"
            style={{
              width: `${volume * 100}%`,
              backgroundColor: getMetricColor(volume, 'volume'),
              boxShadow: `0 0 20px ${getMetricColor(volume, 'volume')}40`
            }}
          />
        </div>
      </div>

      {/* Speaking Rate */}
      <div className="metric-container">
        <div className="metric-header">
          <span className="metric-label">Speaking Rate</span>
          <span className="metric-value">{speakingRate.toFixed(0)}%</span>
        </div>
        <div className="metric-bar-container">
          <div 
            className="metric-bar rate-bar"
            style={{
              width: `${speakingRate}%`,
              backgroundColor: getMetricColor(speakingRate / 100, 'rate'),
              boxShadow: `0 0 20px ${getMetricColor(speakingRate / 100, 'rate')}40`
            }}
          />
        </div>
      </div>

      {/* Voice Energy */}
      <div className="metric-container">
        <div className="metric-header">
          <span className="metric-label">Energy</span>
          <span className="metric-value">{(voiceEnergy * 100).toFixed(0)}%</span>
        </div>
        <div className="metric-bar-container">
          <div 
            className="metric-bar energy-bar"
            style={{
              width: `${voiceEnergy * 100}%`,
              backgroundColor: getMetricColor(voiceEnergy, 'energy'),
              boxShadow: `0 0 20px ${getMetricColor(voiceEnergy, 'energy')}40`
            }}
          />
        </div>
      </div>

      {/* Tonal Quality Indicator */}
      <div className="tonal-quality">
        <span className="quality-label">Tone:</span>
        <span className={`quality-value quality-${tonalQuality}`}>
          {tonalQuality.charAt(0).toUpperCase() + tonalQuality.slice(1)}
        </span>
      </div>
    </div>
  );
};

export default VoiceToneAnalyzer;