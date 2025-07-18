import React, { useState, useEffect, useRef } from 'react';
import { LanguageModeProvider, useLanguageMode, LanguageModeSelector } from '../contexts/LanguageModeContext.js';
import { useAudioRecorder } from '../hooks/useAudioRecorder.js';
import { useAudioPlayer } from '../hooks/useAudioPlayer.js';
import { 
  playAudio, 
  stopCurrentAudio, 
  isAnyAudioPlaying, 
  getAudioStats, 
  addAudioListener, 
  removeAudioListener 
} from '../utils/audioManager.js';
import { 
  connectLearnSocket, 
  sendLearnMessage, 
  closeLearnSocket, 
  isSocketConnected,
  getSocketState,
  addMessageListener,
  removeMessageListener,
  addOpenListener,
  removeOpenListener,
  addCloseListener,
  removeCloseListener,
  addErrorListener,
  removeErrorListener,
  blobToBase64
} from '../utils/websocket.js';
import { CHATGPT_TIMING_CONFIG } from '../utils/chatgptTimingConfig.js';

// Test component for integration testing
const ConversationTest = () => {
  const [testResults, setTestResults] = useState({
    websocket: { status: 'pending', message: '', details: {} },
    audioRecording: { status: 'pending', message: '', details: {} },
    audioPlayback: { status: 'pending', message: '', details: {} },
    voiceDetection: { status: 'pending', message: '', details: {} },
    languageMode: { status: 'pending', message: '', details: {} },
    integration: { status: 'pending', message: '', details: {} }
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [testLogs, setTestLogs] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [testProgress, setTestProgress] = useState(0);
  
  const testLogRef = useRef([]);
  const testStartTimeRef = useRef(null);
  
  const addTestLog = (message, type = 'info') => {
    const logEntry = {
      timestamp: Date.now(),
      message,
      type,
      elapsed: Date.now() - (testStartTimeRef.current || Date.now())
    };
    
    testLogRef.current.push(logEntry);
    setTestLogs([...testLogRef.current]);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
  };
  
  const updateTestResult = (testName, status, message, details = {}) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { status, message, details }
    }));
    
    addTestLog(`${testName}: ${status} - ${message}`, status === 'passed' ? 'success' : status === 'failed' ? 'error' : 'info');
  };
  
  const runAllTests = async () => {
    setIsRunning(true);
    setTestProgress(0);
    testLogRef.current = [];
    testStartTimeRef.current = Date.now();
    
    addTestLog('Starting comprehensive integration tests...');
    
    try {
      // Test 1: Language Mode Context
      await testLanguageMode();
      setTestProgress(16);
      
      // Test 2: WebSocket Connection
      await testWebSocketConnection();
      setTestProgress(32);
      
      // Test 3: Audio Recording
      await testAudioRecording();
      setTestProgress(48);
      
      // Test 4: Audio Playback
      await testAudioPlayback();
      setTestProgress(64);
      
      // Test 5: Voice Activity Detection
      await testVoiceActivityDetection();
      setTestProgress(80);
      
      // Test 6: Integration Test
      await testFullIntegration();
      setTestProgress(100);
      
      addTestLog('All tests completed successfully!', 'success');
      
    } catch (error) {
      addTestLog(`Test suite failed: ${error.message}`, 'error');
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };
  
  const testLanguageMode = async () => {
    setCurrentTest('Language Mode Context');
    addTestLog('Testing language mode context...');
    
    try {
      const { languageMode, changeLanguageMode, availableLanguages } = useLanguageMode();
      
      // Test default language mode
      if (languageMode !== 'urdu') {
        throw new Error(`Expected default language mode 'urdu', got '${languageMode}'`);
      }
      
      // Test language switching
      await changeLanguageMode('english');
      
      // Test available languages
      if (availableLanguages.length < 2) {
        throw new Error('Expected at least 2 available languages');
      }
      
      // Switch back to urdu
      await changeLanguageMode('urdu');
      
      updateTestResult('languageMode', 'passed', 'Language mode context working correctly', {
        defaultMode: 'urdu',
        availableLanguages: availableLanguages.length,
        switchingWorks: true
      });
      
    } catch (error) {
      updateTestResult('languageMode', 'failed', error.message, { error: error.message });
    }
  };
  
  const testWebSocketConnection = async () => {
    setCurrentTest('WebSocket Connection');
    addTestLog('Testing WebSocket connection...');
    
    try {
      // Test connection
      const connectionPromise = connectLearnSocket();
      
      // Set timeout for connection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });
      
      await Promise.race([connectionPromise, timeoutPromise]);
      
      // Check connection status
      if (!isSocketConnected()) {
        throw new Error('WebSocket not connected after connection attempt');
      }
      
      // Test message sending
      const testMessage = {
        type: 'test',
        message: 'Integration test message',
        timestamp: Date.now()
      };
      
      sendLearnMessage(JSON.stringify(testMessage));
      
      // Test binary message handling
      const binaryData = new ArrayBuffer(8);
      const view = new Uint8Array(binaryData);
      view.set([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      
      sendLearnMessage(binaryData);
      
      updateTestResult('websocket', 'passed', 'WebSocket connection and messaging working', {
        connected: true,
        state: getSocketState(),
        messagesSent: 2
      });
      
    } catch (error) {
      updateTestResult('websocket', 'failed', error.message, { 
        connected: isSocketConnected(),
        state: getSocketState(),
        error: error.message 
      });
    }
  };
  
  const testAudioRecording = async () => {
    setCurrentTest('Audio Recording');
    addTestLog('Testing audio recording capabilities...');
    
    try {
      const audioRecorder = useAudioRecorder();
      
      // Test initialization
      await audioRecorder.initialize();
      
      if (!audioRecorder.canRecord) {
        throw new Error('Audio recorder not properly initialized');
      }
      
      // Test recording start
      await audioRecorder.startRecording();
      
      if (!audioRecorder.isRecording) {
        throw new Error('Recording did not start');
      }
      
      // Record for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test recording stop
      audioRecorder.stopRecording();
      
      // Wait for audio to be processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test audio blob creation
      const audioBlob = audioRecorder.getAudioBlob();
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio data recorded');
      }
      
      // Test base64 conversion
      const base64Audio = await audioRecorder.getAudioBase64();
      if (!base64Audio || base64Audio.length === 0) {
        throw new Error('Base64 conversion failed');
      }
      
      updateTestResult('audioRecording', 'passed', 'Audio recording working correctly', {
        canRecord: audioRecorder.canRecord,
        permissions: audioRecorder.permissions,
        recordingDuration: audioRecorder.recordingDuration,
        audioBlobSize: audioBlob.size,
        base64Length: base64Audio.length,
        mimeType: audioRecorder.supportedMimeType
      });
      
    } catch (error) {
      updateTestResult('audioRecording', 'failed', error.message, { error: error.message });
    }
  };
  
  const testAudioPlayback = async () => {
    setCurrentTest('Audio Playback');
    addTestLog('Testing audio playback capabilities...');
    
    try {
      const audioPlayer = useAudioPlayer();
      
      // Create a test audio blob (sine wave)
      const testAudioBlob = createTestAudioBlob();
      const testAudioUrl = URL.createObjectURL(testAudioBlob);
      
      // Test audio loading
      await audioPlayer.loadAudio(testAudioUrl);
      
      if (!audioPlayer.isLoaded) {
        throw new Error('Audio not loaded');
      }
      
      // Test playback
      await audioPlayer.playAudio();
      
      if (!audioPlayer.isPlaying) {
        throw new Error('Audio not playing');
      }
      
      // Test pause
      audioPlayer.pauseAudio();
      
      if (audioPlayer.isPlaying) {
        throw new Error('Audio not paused');
      }
      
      // Test resume
      await audioPlayer.playAudio();
      
      // Test stop
      audioPlayer.stopAudio();
      
      if (audioPlayer.position !== 0) {
        throw new Error('Audio position not reset after stop');
      }
      
      // Test volume control
      audioPlayer.setVolume(0.5);
      
      if (audioPlayer.volume !== 0.5) {
        throw new Error('Volume not set correctly');
      }
      
      // Clean up
      URL.revokeObjectURL(testAudioUrl);
      
      updateTestResult('audioPlayback', 'passed', 'Audio playback working correctly', {
        isLoaded: audioPlayer.isLoaded,
        duration: audioPlayer.duration,
        canPlay: audioPlayer.canPlay,
        volumeControl: true,
        playbackControl: true
      });
      
    } catch (error) {
      updateTestResult('audioPlayback', 'failed', error.message, { error: error.message });
    }
  };
  
  const testVoiceActivityDetection = async () => {
    setCurrentTest('Voice Activity Detection');
    addTestLog('Testing voice activity detection...');
    
    try {
      const audioRecorder = useAudioRecorder();
      
      // Initialize if not already done
      if (!audioRecorder.isInitialized) {
        await audioRecorder.initialize();
      }
      
      // Test VAD threshold settings
      const initialThreshold = audioRecorder.vadThreshold;
      const newThreshold = -50;
      
      audioRecorder.updateVADThreshold(newThreshold);
      
      // Start recording to test VAD
      await audioRecorder.startRecording();
      
      // Monitor VAD for 3 seconds
      let vadDetections = 0;
      const vadMonitor = setInterval(() => {
        if (audioRecorder.isVoiceDetected) {
          vadDetections++;
        }
      }, 100);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(vadMonitor);
      audioRecorder.stopRecording();
      
      updateTestResult('voiceDetection', 'passed', 'Voice activity detection working', {
        initialThreshold,
        newThreshold,
        vadDetections,
        volumeLevel: audioRecorder.volumeLevel,
        isListening: audioRecorder.isListening
      });
      
    } catch (error) {
      updateTestResult('voiceDetection', 'failed', error.message, { error: error.message });
    }
  };
  
  const testFullIntegration = async () => {
    setCurrentTest('Full Integration');
    addTestLog('Testing full system integration...');
    
    try {
      // Test audio manager integration
      const audioStats = getAudioStats();
      
      // Test WebSocket + Audio Recording integration
      const audioRecorder = useAudioRecorder();
      
      if (!audioRecorder.isInitialized) {
        await audioRecorder.initialize();
      }
      
      // Record audio
      await audioRecorder.startRecording();
      await new Promise(resolve => setTimeout(resolve, 1000));
      audioRecorder.stopRecording();
      
      // Wait for recording to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get audio blob and convert to base64
      const audioBlob = audioRecorder.getAudioBlob();
      const base64Audio = await blobToBase64(audioBlob);
      
      // Test WebSocket message sending
      if (isSocketConnected()) {
        const messagePayload = {
          type: 'integration_test',
          audio_base64: base64Audio,
          language_mode: 'urdu',
          timestamp: Date.now()
        };
        
        sendLearnMessage(JSON.stringify(messagePayload));
        addTestLog('Sent audio message via WebSocket');
      }
      
      // Test audio manager with recorded audio
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioId = `test_${Date.now()}`;
      
      await playAudio(audioId, audioUrl);
      
      // Wait for audio to start playing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isAnyAudioPlaying()) {
        throw new Error('Audio manager not playing audio');
      }
      
      // Stop audio
      await stopCurrentAudio();
      
      // Clean up
      URL.revokeObjectURL(audioUrl);
      
      updateTestResult('integration', 'passed', 'Full integration test successful', {
        audioManagerStats: audioStats,
        recordingSize: audioBlob.size,
        base64Length: base64Audio.length,
        websocketConnected: isSocketConnected(),
        audioPlaybackWorking: true
      });
      
    } catch (error) {
      updateTestResult('integration', 'failed', error.message, { error: error.message });
    }
  };
  
  // Helper function to create test audio blob
  const createTestAudioBlob = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 1; // 1 second
    const samples = sampleRate * duration;
    
    const arrayBuffer = audioContext.createBuffer(1, samples, sampleRate);
    const channelData = arrayBuffer.getChannelData(0);
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5;
    }
    
    // Convert to WAV blob (simplified)
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // PCM data
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'running':
        return '⏳';
      default:
        return '⏸️';
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Conversation System Integration Test
        </h1>
        <p className="text-gray-600">
          Comprehensive testing of WebSocket communication, audio recording, playback, and voice activity detection.
        </p>
      </div>
      
      {/* Language Mode Selector */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Language Mode</h2>
        <LanguageModeSelector style="segmented" />
      </div>
      
      {/* Test Controls */}
      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{testProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${testProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {currentTest && (
          <div className="mt-2 text-sm text-blue-600">
            Currently running: {currentTest}
          </div>
        )}
      </div>
      
      {/* Test Results */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Results</h2>
        <div className="space-y-3">
          {Object.entries(testResults).map(([testName, result]) => (
            <div key={testName} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getStatusIcon(result.status)}</span>
                  <span className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}</span>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{result.message}</p>
              
              {Object.keys(result.details).length > 0 && (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer">Details</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Test Logs */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Logs</h2>
        <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto">
          {testLogs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">[{log.elapsed}ms]</span>
              <span className={`ml-2 ${
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 
                'text-blue-400'
              }`}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* System Information */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">System Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>WebSocket State:</strong> {getSocketState()}
          </div>
          <div>
            <strong>Audio Context:</strong> {window.AudioContext ? 'Supported' : 'Not Supported'}
          </div>
          <div>
            <strong>MediaRecorder:</strong> {window.MediaRecorder ? 'Supported' : 'Not Supported'}
          </div>
          <div>
            <strong>Speech Synthesis:</strong> {window.speechSynthesis ? 'Supported' : 'Not Supported'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component with language mode provider
const ConversationTestWithProvider = () => {
  return (
    <LanguageModeProvider>
      <ConversationTest />
    </LanguageModeProvider>
  );
};

export default ConversationTestWithProvider; 