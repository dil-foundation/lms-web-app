import React, { useState } from 'react';
import { LanguageModeProvider, LanguageModeSelector } from '../contexts/LanguageModeContext.tsx';
import ConversationScreen from './ConversationScreen.tsx';

// Example component demonstrating the complete conversation system
const ConversationExample = () => {
  const [showConversation, setShowConversation] = useState(false);
  const [conversationConfig, setConversationConfig] = useState({
    conversationId: 'example_conv_001',
    lessonId: 'lesson_001',
    stageId: 'stage_001',
    initialPrompt: 'Hello! I am your AI language tutor. Let\'s practice speaking together. Please introduce yourself.'
  });

  const startConversation = () => {
    setShowConversation(true);
  };

  const exitConversation = () => {
    setShowConversation(false);
  };

  const updateConfig = (key, value) => {
    setConversationConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (showConversation) {
    return (
      <LanguageModeProvider>
        <ConversationScreen
          onExit={exitConversation}
          conversationId={conversationConfig.conversationId}
          lessonId={conversationConfig.lessonId}
          stageId={conversationConfig.stageId}
          initialPrompt={conversationConfig.initialPrompt}
        />
      </LanguageModeProvider>
    );
  }

  return (
    <LanguageModeProvider>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              AI Language Tutor - Conversation System
            </h1>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">System Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">🎙️ Voice Recording</h3>
                  <p className="text-sm text-blue-700">
                    Real-time audio recording with voice activity detection and automatic silence detection
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">🔊 Audio Playback</h3>
                  <p className="text-sm text-green-700">
                    High-quality audio playback with fade effects and volume control
                  </p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">🌐 WebSocket Communication</h3>
                  <p className="text-sm text-purple-700">
                    Real-time bidirectional communication with binary and text message support
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-medium text-orange-900 mb-2">🗣️ Speech Synthesis</h3>
                  <p className="text-sm text-orange-700">
                    Word-by-word pronunciation using Web Speech API with language support
                  </p>
                </div>
                
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h3 className="font-medium text-pink-900 mb-2">🌏 Multi-Language</h3>
                  <p className="text-sm text-pink-700">
                    Support for English and Urdu with RTL text support and language-specific settings
                  </p>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="font-medium text-indigo-900 mb-2">🔧 Advanced State Management</h3>
                  <p className="text-sm text-indigo-700">
                    Complex state machine with 15+ states for smooth conversation flow
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language Mode
                  </label>
                  <LanguageModeSelector style="segmented" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conversation ID
                  </label>
                  <input
                    type="text"
                    value={conversationConfig.conversationId}
                    onChange={(e) => updateConfig('conversationId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter conversation ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson ID
                  </label>
                  <input
                    type="text"
                    value={conversationConfig.lessonId}
                    onChange={(e) => updateConfig('lessonId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter lesson ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stage ID
                  </label>
                  <input
                    type="text"
                    value={conversationConfig.stageId}
                    onChange={(e) => updateConfig('stageId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter stage ID"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Prompt
                  </label>
                  <textarea
                    value={conversationConfig.initialPrompt}
                    onChange={(e) => updateConfig('initialPrompt', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter initial AI prompt"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Browser Requirements</h2>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">⚠️ Required Browser Features</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• MediaRecorder API (for audio recording)</li>
                  <li>• Web Audio API (for voice activity detection)</li>
                  <li>• WebSocket API (for real-time communication)</li>
                  <li>• Speech Synthesis API (for text-to-speech)</li>
                  <li>• Microphone permissions (for voice input)</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={startConversation}
                className="bg-secondary hover:bg-secondary/90 text-white dark:text-secondary-foreground px-8 py-3 rounded-lg font-medium text-lg transition-colors shadow-lg"
              >
                Start Conversation
              </button>
            </div>
          </div>
          
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Usage Instructions</h2>
            <div className="prose prose-sm text-gray-600">
              <ol className="space-y-2">
                <li>
                  <strong>Configure the conversation:</strong> Set the conversation ID, lesson ID, and stage ID according to your backend requirements.
                </li>
                <li>
                  <strong>Choose language mode:</strong> Select between English and Urdu using the language selector.
                </li>
                <li>
                  <strong>Start the conversation:</strong> Click the "Start Conversation" button to begin.
                </li>
                <li>
                  <strong>Grant microphone permissions:</strong> Allow microphone access when prompted by the browser.
                </li>
                <li>
                  <strong>Speak naturally:</strong> Tap the microphone button and speak. The system will automatically detect when you stop speaking.
                </li>
                <li>
                  <strong>Listen to responses:</strong> The AI will respond with voice messages that you can listen to.
                </li>
                <li>
                  <strong>Exit when done:</strong> Use the X button in the top-left corner to exit the conversation.
                </li>
              </ol>
            </div>
          </div>
          
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Technical Architecture</h2>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>WebSocket Utility:</strong> Handles real-time communication with auto-reconnection and binary message support.
              </p>
              <p>
                <strong>Audio Manager:</strong> Singleton pattern for global audio management with duplicate playback prevention.
              </p>
              <p>
                <strong>Audio Recorder Hook:</strong> MediaRecorder API integration with voice activity detection using Web Audio API.
              </p>
              <p>
                <strong>Audio Player Hook:</strong> HTML5 Audio API wrapper with advanced playback controls and error handling.
              </p>
              <p>
                <strong>Language Context:</strong> React Context for multi-language support with localStorage persistence.
              </p>
              <p>
                <strong>Conversation Component:</strong> Complex state machine managing 15+ conversation states with comprehensive error handling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LanguageModeProvider>
  );
};

export default ConversationExample; 