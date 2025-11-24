import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Bot, User, Play, Pause, RefreshCw, Loader2, Target, TrendingUp, CheckCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
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

interface ExerciseCompletion {
  exercise_completed: boolean;
  progress_percentage: number;
  completed_topics: number;
  total_topics: number;
  current_topic_id: number;
  stage_id: number;
  exercise_id: number;
  exercise_name: string;
  stage_name: string;
  completion_date?: string | null;
}
import { useToast } from '@/hooks/use-toast';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/hooks/useAuth';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { CompletionDialog } from '@/components/practice/CompletionDialog';

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
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(new Set());
  const [currentTopicIdNum, setCurrentTopicIdNum] = useState<number>(1);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  
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
      
      // Fetch user's current topic progress if user is logged in
      if (user?.id) {
        try {
          const { getCurrentTopicProgress } = await import('@/utils/progressTracker');
          const progressResponse = await getCurrentTopicProgress(
            user.id,
            5, // Stage 5
            1  // Exercise 1 (CriticalThinkingDialogues)
          );
          
          if (progressResponse.success && progressResponse.data?.current_topic_id) {
            const topicId = progressResponse.data.current_topic_id;
            setCurrentTopicIdNum(topicId);
            console.log('📍 Current topic ID:', topicId);
            
            // Mark all topics before current topic as completed
            const completed = new Set<number>();
            for (let i = 1; i < topicId; i++) {
              completed.add(i);
            }
            setCompletedTopics(completed);
            console.log(`✅ Marked ${completed.size} topics as completed`);
          }
        } catch (progressError) {
          console.warn('Could not fetch current topic progress:', progressError);
        }
      }
      
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
      
      // Save progress when selecting a topic
      if (user?.id) {
        try {
          const topicIndex = topics.findIndex(t => t.topic_id === topicId);
          if (topicIndex !== -1) {
            const topicNumber = topicIndex + 1; // 1-based
            const { updateCurrentTopic } = await import('@/utils/progressTracker');
            await updateCurrentTopic(
              user.id,
              5, // Stage 5
              1, // Exercise 1 (CriticalThinkingDialogues)
              topicNumber
            );
            console.log(`Progress saved: Topic ${topicNumber} of ${topics.length}`);
          }
        } catch (error) {
          console.warn('Failed to save progress:', error);
        }
      }
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
      }) as any;

      // Handle API error responses (like no_speech_detected)
      if (evaluationResponse.success === false || evaluationResponse.error) {
        const errorMessage = evaluationResponse.message || evaluationResponse.error || 'Speech evaluation failed';
        
        // Create modified feedback object for error cases
        const errorFeedback = {
          ...evaluationResponse,
          evaluation: {
            ...evaluationResponse.evaluation,
            evaluation: {
              ...evaluationResponse.evaluation?.evaluation,
              overall_score: 0,
              feedback: errorMessage,
              suggested_improvements: ['Please speak more clearly and try again']
            }
          }
        };
        
        setEvaluation(errorFeedback);
        setShowFeedback(true);
        return;
      }

      setEvaluation(evaluationResponse);
      setShowFeedback(true);
      
      // Check if the exercise is completed based on API response
      if (evaluationResponse?.exercise_completion?.exercise_completed) {
        // Exercise is completed according to the API
        setIsCompleted(true);
        setShowCompletionDialog(true);
      }
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
    setIsCompleted(false);
    setShowCompletionDialog(false);
    stopAudio();
  };

  const handleRedo = () => {
    setShowCompletionDialog(false);
    setIsCompleted(false);
    resetConversation();
  };

  const handleContinue = () => {
    setShowCompletionDialog(false);
    selectNewTopic();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Consistent Header Section */}
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb Navigation */}
          <PracticeBreadcrumb className="mb-6" />
          
          {/* Header with Back Button and Title */}
          <div className="relative flex items-center justify-center mb-6 sm:mb-8 text-center">
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
              className="absolute left-0 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-2 sm:space-y-3 px-12 sm:px-0">
              <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <Target className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Critical Thinking Dialogues
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Engage in thoughtful discussions and develop analytical skills
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12 px-6">
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <span className="text-muted-foreground text-lg">Loading...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Topic Selection */}
        {showTopicSelection && !isLoading && (
          <div className="px-4 sm:px-6 pb-8 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-6 sm:mb-8">
              Select a Critical Thinking Topic
            </h2>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {topics.map((topic, index) => {
                const topicNumber = index + 1;
                const isCompleted = completedTopics.has(topicNumber);
                
                return (
                <Card 
                  key={topic.topic_id}
                  className={`cursor-pointer hover:shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden relative ${
                    isCompleted ? 'ring-2 ring-primary/50' : ''
                  }`}
                  onClick={() => loadTopic(topic.topic_id)}
                >
                  {isCompleted && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-md z-10">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary mb-2 sm:mb-3 text-base sm:text-lg">
                          {topic.topic_title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                          {topic.topic_description}
                        </p>
                        <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-muted-foreground">
                          <span className="px-2.5 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border border-primary/20">
                            {topic.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
            
            {topics.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No topics available at the moment.</p>
                <Button 
                  variant="outline" 
                  onClick={loadTopics}
                  className="mt-4 px-6 py-2 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-2xl"
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
          <Card className="mb-6 border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-primary mb-3">
                  Topic
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentTopic.topic}
                </p>
                
                {/* Expected Keywords */}
                {currentTopic.expected_keywords && currentTopic.expected_keywords.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-primary mb-3">Expected Keywords:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {currentTopic.expected_keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-primary text-xs rounded-full border border-primary/20"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground mb-4">
                  <span className="px-3 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full border border-primary/20">
                    {currentTopic.category}
                  </span>
                </div>
                
                {/* Audio Play Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className="w-16 h-16 bg-gradient-to-r from-[#1582B4] to-[#1582B4]/90 hover:from-[#1582B4]/90 hover:to-[#1582B4] disabled:from-[#1582B4]/50 disabled:to-[#1582B4]/50 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#1582B4]/40 focus:ring-offset-2"
                    title={isLoadingAudio ? "Loading audio..." : audioState.isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : audioState.isPlaying ? (
                      <Pause className="h-6 w-6 text-white" />
                    ) : (
                      <Play className="h-6 w-6 text-white ml-1" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation */}
        {currentTopic && !showTopicSelection && (
          <div className="px-4 sm:px-6 pb-8 mt-6 sm:mt-8 space-y-4 mb-6">
            {conversation.map((message) => (
              <Card 
                key={message.id} 
                className={`${
                  message.sender === 'user' 
                    ? 'border-0 bg-gradient-to-br from-primary/20 to-primary/30 rounded-3xl shadow-lg overflow-hidden' 
                    : 'border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden'
                }`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-white/20' 
                        : 'bg-[#1582B4]/20'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      ) : (
                        <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-[#1582B4]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`text-xs sm:text-sm font-semibold ${
                          message.sender === 'user' 
                            ? 'text-white' 
                            : 'text-[#1582B4]'
                        }`}>
                          {message.sender === 'user' ? 'You' : 'AI Tutor'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm px-2 py-1 rounded-full">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className={`${
                        message.sender === 'user' ? 'text-white' : 'text-foreground'
                      } text-sm sm:text-base leading-relaxed`}>
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
          <div className="mb-6 px-4 sm:px-6">
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-[#1582B4]" />
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#1582B4] mb-2">
                      Evaluating Your Response
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
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
          <div className="mb-6 px-4 sm:px-6">
            <h3 className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-[#1582B4] via-[#1582B4]/90 to-[#1582B4] bg-clip-text text-transparent mb-4 sm:mb-6">
              Your Performance
            </h3>
            
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-3">
                      {evaluation?.evaluation?.evaluation?.overall_score || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords Used */}
              <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#1582B4]/20 rounded-2xl flex items-center justify-center mt-1">
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-[#1582B4]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1582B4] mb-2 sm:mb-3 text-base sm:text-lg">
                        Keywords Used ({evaluation?.evaluation?.evaluation?.matched_keywords_count || 0} / {evaluation?.evaluation?.evaluation?.total_keywords || 0})
                      </h4>
                      {evaluation?.evaluation?.evaluation?.keyword_matches && 
                       Array.isArray(evaluation.evaluation.evaluation.keyword_matches) && 
                       evaluation.evaluation.evaluation.keyword_matches.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {evaluation.evaluation.evaluation.keyword_matches.map((keyword, index) => (
                            <span 
                              key={index}
                              className="px-2.5 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-[#1582B4] text-xs rounded-full border border-[#1582B4]/20"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs sm:text-sm">No keywords used</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Suggested Improvements */}
              {evaluation?.evaluation?.evaluation?.suggested_improvements && 
               Array.isArray(evaluation.evaluation.evaluation.suggested_improvements) && 
               evaluation.evaluation.evaluation.suggested_improvements.length > 0 && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-2xl flex items-center justify-center mt-1">
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary mb-2 sm:mb-3 text-base sm:text-lg">Suggested Improvements</h4>
                        <ul className="space-y-1 sm:space-y-2">
                          {evaluation.evaluation.evaluation.suggested_improvements.map((suggestion, index) => (
                            <li key={index} className="text-muted-foreground text-xs sm:text-sm flex items-start space-x-2">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span>{suggestion}</span>
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
          <div className="text-center px-6 mb-6">
            {showFeedback ? (
              <Button
                onClick={resetConversation}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                size="lg"
                disabled={isLoading || isEvaluating}
              >
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
              </Button>
            ) : !isRecording && !isEvaluating ? (
              <Button
                onClick={handleStartRecording}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                size="lg"
                disabled={isLoading}
              >
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
              </Button>
            ) : isRecording ? (
              <Button
                onClick={handleStopRecording}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
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
          <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg mx-6 mb-6">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Engage in thoughtful discussion with the AI tutor on complex topics
                </p>
                {currentTopic.keywords.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {currentTopic.keywords.slice(0, 5).map((keyword, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-xs rounded-full border border-primary/20"
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

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        exerciseName="Critical Thinking Dialogues"
        score={evaluation?.evaluation?.evaluation?.overall_score || 0}
        onRedo={handleRedo}
        onContinue={handleContinue}
      />
    </div>
  );
} 