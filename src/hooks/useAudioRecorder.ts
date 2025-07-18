import { useState, useRef, useCallback } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isListening: boolean;
  isVoiceDetected: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  error: string | null;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

// Improved timing configuration for better voice detection
const VOICE_DETECTION_CONFIG = {
  INITIAL_SILENCE_DURATION: 15000, // 15 seconds before first speech (increased)
  POST_SPEECH_SILENCE_DURATION: 3000, // 3 seconds after speech (increased)
  MIN_SPEECH_DURATION: 800, // 800ms minimum speech (increased)
  VOLUME_THRESHOLD: 0.025, // Higher threshold to reduce false positives
  SMOOTHING_FACTOR: 0.9, // More smoothing to reduce noise
  ENABLED: false, // Disable automatic voice detection for now
};

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      setError('Microphone access denied. Please allow microphone access and try again.');
      return false;
    }
  }, []);

  const setupVoiceActivityDetection = useCallback((stream: MediaStream): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = VOICE_DETECTION_CONFIG.SMOOTHING_FACTOR;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let speechStartTime: number | null = null;
      let lastVoiceTime: number = Date.now();
      
      const checkVoiceActivity = (): void => {
        if (!analyserRef.current || !isRecordingRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate RMS volume (proper volume calculation)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / bufferLength);
        
        const isVoiceDetected = rms > VOICE_DETECTION_CONFIG.VOLUME_THRESHOLD;
        const currentTime = Date.now();
        
        if (isVoiceDetected) {
          lastVoiceTime = currentTime;
          if (!speechStartTime) {
            speechStartTime = currentTime;
            console.log('Voice detected! RMS:', rms.toFixed(4), 'Threshold:', VOICE_DETECTION_CONFIG.VOLUME_THRESHOLD);
          }
          
          // Reset silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          // Check for silence timeout
          const silenceDuration = speechStartTime 
            ? VOICE_DETECTION_CONFIG.POST_SPEECH_SILENCE_DURATION
            : VOICE_DETECTION_CONFIG.INITIAL_SILENCE_DURATION;
          
          const timeSinceLastVoice = currentTime - lastVoiceTime;
          
          if (timeSinceLastVoice > silenceDuration) {
            // Only stop if we had some speech or exceeded initial timeout
            if (speechStartTime || (timeSinceLastVoice > VOICE_DETECTION_CONFIG.INITIAL_SILENCE_DURATION)) {
              const speechDuration = speechStartTime ? currentTime - speechStartTime : 0;
              console.log('Auto-stopping recording:', {
                reason: speechStartTime ? 'post-speech silence' : 'initial timeout',
                speechDuration,
                timeSinceLastVoice,
                silenceDuration
              });
              stopRecording();
              return;
            }
          }
          
          // Debug logging for silence detection
          if (timeSinceLastVoice > 1000) { // Log every second after 1 second of silence
            console.log('Silence detected:', {
              timeSinceLastVoice,
              silenceDuration,
              speechStartTime: !!speechStartTime,
              rms: rms.toFixed(4)
            });
          }
        }
        
        // Continue monitoring
        requestAnimationFrame(checkVoiceActivity);
      };
      
      checkVoiceActivity();
    } catch (error) {
      console.error('Error setting up voice activity detection:', error);
      setError('Voice detection setup failed. Recording may not auto-stop.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      isRecordingRef.current = true;
      
      // Determine the best MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });
      
      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        setAudioBlob(blob);
        
        // Cleanup
        cleanup();
      };
      
      mediaRecorderRef.current.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        cleanup();
      };
      
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      // Setup voice activity detection only if enabled
      if (VOICE_DETECTION_CONFIG.ENABLED) {
        setupVoiceActivityDetection(stream);
      } else {
        console.log('Voice activity detection disabled - manual control only');
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please check your microphone.');
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestPermissions, setupVoiceActivityDetection]);

  const cleanup = useCallback((): void => {
    isRecordingRef.current = false;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    analyserRef.current = null;
  }, []);

  const stopRecording = useCallback((): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const resetRecording = useCallback((): void => {
    setAudioBlob(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  return {
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  };
};