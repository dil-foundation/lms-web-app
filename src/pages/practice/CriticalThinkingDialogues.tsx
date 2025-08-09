import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Bot, User, Play, Pause, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchCriticalThinkingTopics, 
  fetchCriticalThinkingTopic,
  fetchCriticalThinkingTopicAudio,
  evaluateCriticalThinking,
  type CriticalThinkingTopic,
  type CriticalThinkingTopicDetail,
  type CriticalThinkingAudioResponse,
  type CriticalThinkingEvaluationResponse
} from '@/services/criticalThinkingService';
import { useToast } from '@/hooks/use-toast';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';

interface ConversationMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  timestamp: Date;
}

export default function CriticalThinkingDialogues() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [topics, setTopics] = useState<CriticalThinkingTopic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<CriticalThinkingTopicDetail | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [evaluation, setEvaluation] = useState<CriticalThinkingEvaluationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTopicSelection, setShowTopicSelection] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Audio hooks
  const { 
    state: audioState, 
    playAudio, 
    pauseAudio, 
    stopAudio 
  } = useAudioPlayer();
  
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    audioBlob
  } = useAudioRecorder();

  // Load topics on component mount
  useEffect(() => {
    loadTopics();
  }, []);

  // Handle audio blob when recording stops
  useEffect(() => {
    if (audioBlob && currentTopic) {
      handleAudioResponse(audioBlob);
    }
  }, [audioBlob, currentTopic]);

  const loadTopics = async () => {
    setIsLoading(true);
    try {
      const fetchedTopics = await fetchCriticalThinkingTopics();
      setTopics(fetchedTopics);
      
      if (fetchedTopics.length > 0) {
        // Auto-select first topic if available
        setSelectedTopicId(fetchedTopics[0].topic_id);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      toast({
        title: "Error Loading Topics",
        description: error instanceof Error ? error.message : "Failed to load critical thinking topics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTopic = async (topicId: string) => {
    setIsLoading(true);
    try {
      const topicDetail = await fetchCriticalThinkingTopic(topicId);
      setCurrentTopic(topicDetail);
      setSelectedTopicId(topicId);
      setShowTopicSelection(false);
      
      // Initialize conversation with the first question
      const initialQuestion = topicDetail.questions[0] || topicDetail.topic_title;
      setConversation([{
        id: '1',
        sender: 'ai',
        message: initialQuestion,
        timestamp: new Date()
      }]);

      // Set start time for timing tracking
      setStartTime(new Date());

      // Reset audio state
      setAudioUrl(null);
    } catch (error) {
      console.error('Error loading topic:', error);
      toast({
        title: "Error Loading Topic",
        description: error instanceof Error ? error.message : "Failed to load topic details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handlePlayAudio = async () => {
    if (!currentTopic) return;

    // If audio is currently playing, pause it
    if (audioState.isPlaying) {
      pauseAudio();
      return;
    }

    // If we already have audio URL, play it
    if (audioUrl) {
      await playAudio(audioUrl);
      return;
    }

    // Otherwise, fetch and play audio
    setIsLoadingAudio(true);
    try {
      const audioResponse = await fetchCriticalThinkingTopicAudio(currentTopic.topic_id);
      if (audioResponse.audio_url) {
        setAudioUrl(audioResponse.audio_url);
        await playAudio(audioResponse.audio_url);
        console.log('✅ Audio fetched and playing:', audioResponse.audio_url);
      }
    } catch (error) {
      console.error('Error loading and playing audio:', error);
      toast({
        title: "Audio Error",
        description: "Failed to load and play audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      setRecordingStartTime(new Date());
      await startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording.",
        variant: "destructive",
      });
    }
  };

  const handleAudioResponse = async (audioBlob: Blob) => {
    if (!currentTopic || !user || !recordingStartTime) return;

    setIsEvaluating(true);
    try {
      console.log('🎤 Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type,
        recordingDuration: recordingStartTime ? Date.now() - recordingStartTime.getTime() : 0
      });

      // Convert audio blob to base64 using Promise-based approach
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(audioBlob);
      });
      
      // Check if we have valid base64 data
      if (!base64Audio || !base64Audio.includes(',')) {
        throw new Error('Invalid audio data format');
      }
      
      const audioData = base64Audio.split(',')[1]; // Remove data URL prefix
      
      console.log('📤 Sending audio data:', {
        base64Length: audioData.length,
        mimeType: base64Audio.split(',')[0],
        audioDataPreview: audioData.substring(0, 100) + '...'
      });

      // Calculate time spent on this recording
      const recordingEndTime = new Date();
      const timeSpentSeconds = Math.floor((recordingEndTime.getTime() - recordingStartTime.getTime()) / 1000);

      // Generate filename based on timestamp and topic - use proper audio extension
      const audioFormat = audioBlob.type.includes('webm') ? 'webm' : 
                         audioBlob.type.includes('mp4') ? 'mp4' : 
                         audioBlob.type.includes('wav') ? 'wav' : 'webm';
      const filename = `critical_thinking_${currentTopic.topic_id}_${Date.now()}.${audioFormat}`;

      console.log('📊 Evaluation request payload:', {
        topic_id: parseInt(currentTopic.topic_id) || 0,
        filename: filename,
        user_id: user.id,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: false,
        audio_size: audioData.length
      });

      // Evaluate the response using the correct API format
      const evaluationResponse = await evaluateCriticalThinking({
        audio_base64: audioData,
        topic_id: parseInt(currentTopic.topic_id) || 0,
        filename: filename,
        user_id: user.id,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: false, // You might want to detect this or make it configurable
      });

      setEvaluation(evaluationResponse);
      setShowFeedback(true);
    } catch (error) {
      console.error('Error evaluating response:', error);
      toast({
        title: "Evaluation Error",
        description: error instanceof Error ? error.message : "Failed to evaluate your response",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const addUserMessage = (message: string) => {
    const newMessage: ConversationMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      message,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, newMessage]);
  };

  const addAIMessage = (message: string) => {
    const newMessage: ConversationMessage = {
      id: `ai_${Date.now()}`,
      sender: 'ai',
      message,
      timestamp: new Date()
    };
    setConversation(prev => [...prev, newMessage]);
  };

  const resetConversation = () => {
    setShowFeedback(false);
    setEvaluation(null);
    setRecordingStartTime(null);
    setIsEvaluating(false);
    if (currentTopic) {
      // Reset to initial question
      const initialQuestion = currentTopic.questions[0] || currentTopic.topic_title;
      setConversation([{
        id: '1',
        sender: 'ai',
        message: initialQuestion,
        timestamp: new Date()
      }]);
      // Reset start time for new conversation
      setStartTime(new Date());
    }
  };

  const selectNewTopic = () => {
    setShowTopicSelection(true);
    setCurrentTopic(null);
    setConversation([]);
    setShowFeedback(false);
    setEvaluation(null);
    setStartTime(null);
    setRecordingStartTime(null);
    setAudioUrl(null);
    setIsEvaluating(false);
    stopAudio();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (currentTopic && !showTopicSelection) {
                // If viewing a topic, go back to topic selection
                selectNewTopic();
              } else {
                // If on topic selection, go back to Stage 5
                navigate('/dashboard/practice/stage-5');
              }
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Critical Thinking Dialogues
            </h1>
            {currentTopic && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentTopic.topic_title}
              </p>
            )}
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        )}

        {/* Topic Selection */}
        {showTopicSelection && !isLoading && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">Select a Critical Thinking Topic</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {topics.map((topic) => (
                <Card 
                  key={topic.topic_id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-green-200 dark:hover:border-green-800"
                  onClick={() => loadTopic(topic.topic_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-green-600 dark:text-green-400 mb-2">
                          {topic.topic_title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {topic.topic_description}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{topic.category}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {topics.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No topics available at the moment.</p>
                <Button 
                  variant="outline" 
                  onClick={loadTopics}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Topic Information */}
        {currentTopic && !showTopicSelection && (
          <Card className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Topic
                </h2>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  {currentTopic.topic}
                </p>
                
                {/* Expected Keywords */}
                {currentTopic.expected_keywords && currentTopic.expected_keywords.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">Expected Keywords:</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {currentTopic.expected_keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-white dark:text-blue-200 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground mb-3">
                  <span>{currentTopic.category}</span>
                </div>
                
                {/* Audio Play Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className="w-12 h-12 bg-green-500 hover:bg-green-600 disabled:bg-green-300 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                    title={isLoadingAudio ? "Loading audio..." : audioState.isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : audioState.isPlaying ? (
                      <Pause className="h-5 w-5 text-white ml-0" />
                    ) : (
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation */}
        {currentTopic && !showTopicSelection && (
          <div className="space-y-4 mb-6">
            {conversation.map((message) => (
              <Card 
                key={message.id} 
                className={message.sender === 'user' ? 'bg-green-600 dark:bg-green-700' : 'border-dashed border-2 border-muted-foreground/20'}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-white/20' 
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-5 w-5 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${
                          message.sender === 'user' 
                            ? 'text-white' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {message.sender === 'user' ? 'You' : 'AI Tutor'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className={message.sender === 'user' ? 'text-white' : 'text-foreground'}>
                        {message.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Evaluation Loading State */}
        {isEvaluating && (
          <div className="mb-6">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      Evaluating Your Response
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Please wait while we analyze your critical thinking skills...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback Section */}
        {showFeedback && evaluation && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Your Performance</h3>
            
            <div className="space-y-4">
              {/* Overall Score */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                      {evaluation?.evaluation?.evaluation?.overall_score || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords Used */}
              <Card className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Bot className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-cyan-600 dark:text-cyan-400 mb-2">
                        Keywords Used ({evaluation?.evaluation?.evaluation?.matched_keywords_count || 0} / {evaluation?.evaluation?.evaluation?.total_keywords || 0})
                      </h4>
                      {evaluation?.evaluation?.evaluation?.keyword_matches && 
                       Array.isArray(evaluation.evaluation.evaluation.keyword_matches) && 
                       evaluation.evaluation.evaluation.keyword_matches.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {evaluation.evaluation.evaluation.keyword_matches.map((keyword, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-cyan-200 dark:bg-cyan-800 text-cyan-800 dark:text-cyan-200 text-xs rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-cyan-700 dark:text-cyan-300 text-sm">No keywords used</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Improvements */}
              {evaluation?.evaluation?.evaluation?.suggested_improvements && 
               Array.isArray(evaluation.evaluation.evaluation.suggested_improvements) && 
               evaluation.evaluation.evaluation.suggested_improvements.length > 0 && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mt-1">
                        <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Suggested Improvements</h4>
                        <ul className="space-y-1">
                          {evaluation.evaluation.evaluation.suggested_improvements.map((suggestion, index) => (
                            <li key={index} className="text-blue-700 dark:text-blue-300 text-sm">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {currentTopic && !showTopicSelection && (
          <div className="text-center">
            {showFeedback ? (
              <Button
                onClick={resetConversation}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
                disabled={isLoading || isEvaluating}
              >
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
              </Button>
            ) : !isRecording && !isEvaluating ? (
              <Button
                onClick={handleStartRecording}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
                disabled={isLoading}
              >
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
              </Button>
            ) : isRecording ? (
              <Button
                onClick={handleStopRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium animate-pulse"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Stop Recording
              </Button>
            ) : null}
          </div>
        )}

        {/* Instructions */}
        {currentTopic && !showTopicSelection && (
          <Card className="mt-6 bg-muted/50">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Engage in thoughtful discussion with the AI tutor on complex topics
                </p>
                {currentTopic.keywords.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {currentTopic.keywords.slice(0, 5).map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-muted text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 