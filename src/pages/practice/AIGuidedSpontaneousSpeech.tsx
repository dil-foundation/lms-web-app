import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Bot, User, Rocket, Clock, Zap, Loader2, Play, Pause, Target, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  spontaneousSpeechService, 
  SpontaneousSpeechTopic,
  SpontaneousSpeechEvaluation
} from '@/services/spontaneousSpeechService';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  timestamp: Date;
  responseTime?: number;
}

export default function AIGuidedSpontaneousSpeech() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [topics, setTopics] = useState<SpontaneousSpeechTopic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<SpontaneousSpeechTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  // Load topics on component mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        setLoading(true);
        const fetchedTopics = await spontaneousSpeechService.getAllTopics();
        setTopics(fetchedTopics);
        
        // Set first topic as default if available
        if (fetchedTopics.length > 0) {
          setCurrentTopic(fetchedTopics[0]);
        }
      } catch (error) {
        console.error('Error loading topics:', error);
        toast.error('Failed to load spontaneous speech topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);

  const handleStartSession = () => {
    setSessionStarted(true);
    setShowFeedback(true);
  };

  const handleStartRecording = async () => {
    try {
      console.log('Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        console.log('Data available, size:', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstart = () => {
        console.log('Recording started');
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, chunks:', chunks.length);
        const audioBlob = new Blob(chunks, { type: 'audio/webm' }); // Use webm which is more widely supported
        console.log('Audio blob created, size:', audioBlob.size);
        
        if (audioBlob.size > 0) {
          await handleEvaluateRecording(audioBlob);
        } else {
          console.error('No audio data recorded');
          toast.error('No audio was recorded. Please try again.');
          setIsEvaluating(false);
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred');
        setIsRecording(false);
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      setRecordingStartTime(Date.now());
      
      // Start recording with timeslice to ensure data is available
      recorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      
      console.log('MediaRecorder started, state:', recorder.state);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const handleStopRecording = () => {
    console.log('Stop recording called, mediaRecorder state:', mediaRecorder?.state);
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      console.log('Stopping media recorder...');
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('Recording stopped, evaluating...');
    } else {
      console.error('MediaRecorder is not available or already inactive');
      toast.error('Recording is not active');
      setIsRecording(false);
    }
  };

  const handleTopicClick = (topic: SpontaneousSpeechTopic) => {
    setCurrentTopic(topic);
    setSessionStarted(true);
    setShowFeedback(true);
    
    // Initialize conversation with topic's prompt
    const initialMessage: ConversationMessage = {
      id: '1',
      sender: 'ai',
      message: topic.prompt_text || topic.description || `Let's discuss: ${topic.title}`,
      timestamp: new Date(),
    };
    
    setConversation([initialMessage]);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
    setConversation([]);
    setEvaluationResult(null);
    setIsEvaluating(false);
    cleanupCurrentAudio();
  };

  const cleanupCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
    setIsPlayingAudio(false);
  };

  const handlePlayAudio = async () => {
    if (!currentTopic) return;

    try {
      // If audio is already playing, pause it
      if (isPlayingAudio && currentAudio) {
        currentAudio.pause();
        return;
      }

      // If we have current audio but it's paused, resume it
      if (currentAudio && !isPlayingAudio) {
        currentAudio.play();
        return;
      }

      // Load new audio
      setIsLoadingAudio(true);
      const audioUrl = await spontaneousSpeechService.getTopicAudio(currentTopic.id);
      
      cleanupCurrentAudio();
      
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => setIsPlayingAudio(true);
      audio.onpause = () => setIsPlayingAudio(false);
      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        toast.error('Failed to play audio');
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to load audio');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleEvaluateRecording = async (audioBlob: Blob) => {
    console.log('Starting evaluation, blob size:', audioBlob.size);
    
    if (!currentTopic || !user) {
      console.error('Missing topic or user:', { currentTopic: !!currentTopic, user: !!user });
      toast.error('Missing topic or user information');
      return;
    }

    try {
      setIsEvaluating(true);
      console.log('Evaluation state set to true');
      
      // Convert audio blob to base64 using FileReader for better compatibility
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64 string
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      console.log('Base64 conversion completed, length:', base64Audio.length);
      
      // Calculate time spent in seconds
      const timeSpentSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
      console.log('Time spent:', timeSpentSeconds, 'seconds');
      
      // Generate filename
      const filename = `spontaneous_speech_${currentTopic.id}_${Date.now()}.wav`;
      console.log('Calling evaluation API with:', {
        topicId: currentTopic.id,
        filename,
        userId: user.id,
        timeSpentSeconds,
        audioLength: base64Audio.length
      });
      
      const evaluation = await spontaneousSpeechService.evaluateSpontaneousSpeech(
        base64Audio,
        currentTopic.id,
        filename,
        user.id,
        timeSpentSeconds,
        false // urdu_used - you can modify this based on your needs
      );
      
      console.log('Evaluation result:', evaluation);
      setEvaluationResult(evaluation);
      toast.success('Evaluation completed!');
      
    } catch (error) {
      console.error('Error evaluating recording:', error);
      toast.error(`Failed to evaluate recording: ${error.message}`);
    } finally {
      setIsEvaluating(false);
      console.log('Evaluation state set to false');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 pb-8 mt-8 space-y-6">
          <div className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
            <div className="p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-primary font-medium">Loading spontaneous speech topics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          {/* Consistent Header Section */}
          <div className="px-6 py-8">
            {/* Breadcrumb Navigation */}
            <PracticeBreadcrumb className="mb-6" />
            
            {/* Header with Back Button and Title */}
            <div className="relative flex items-center justify-center mb-8 text-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/dashboard/practice/stage-6')}
                className="absolute left-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </Button>
              
              <div className="space-y-3">
                <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Spontaneous Speech
                </h1>
                <p className="text-muted-foreground text-lg">
                  Master the art of impromptu speaking with AI guidance
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-6 pb-8 space-y-6">
            {/* Topic Selection */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">Choose Your Discussion Topic</h2>
              <p className="text-muted-foreground text-lg">Click on a topic to start your conversation immediately</p>
            </div>

            {topics.length > 0 ? (
              <div className="space-y-4">
                {topics.map((topic) => (
                  <Card 
                    key={topic.id}
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden"
                    onClick={() => handleTopicClick(topic)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center border border-primary/30">
                            <Rocket className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2 text-primary">{topic.title}</h3>
                            <p className="text-muted-foreground text-sm mb-2">{topic.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {(topic.complexity || topic.difficulty_level) && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 ${
                              (topic.complexity === 'Expert' || topic.difficulty_level === 'Expert')
                                ? 'text-red-700 dark:text-red-300' 
                                : 'text-orange-700 dark:text-orange-300'
                            }`}>
                              {topic.complexity || topic.difficulty_level}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
                <CardContent className="p-8 text-center">
                  <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-muted-foreground mb-2">No Topics Available</h4>
                  <p className="text-muted-foreground text-sm">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Session Guidelines */}
            <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-primary">Session Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Respond naturally and spontaneously - don't overthink your answers
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Focus on fluency and natural flow rather than perfect grammar
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Express your genuine thoughts and opinions on the topic
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      The AI will adapt to your level and provide natural responses
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Consistent Header Section */}
        <div className="px-6 py-8">
          {/* Breadcrumb Navigation */}
          <PracticeBreadcrumb className="mb-6" />
          
          {/* Header with Back Button and Title */}
          <div className="relative flex items-center justify-center mb-8 text-center">
            <Button
              variant="outline"
              size="icon"
              onClick={resetSession}
              className="absolute left-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-3">
              <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Spontaneous Speech
              </h1>
              <p className="text-muted-foreground text-lg">
                Master the art of impromptu speaking with AI guidance
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-6 pb-8 space-y-6">
          {/* Current Topic */}
          {currentTopic && (
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary text-lg mb-2">{currentTopic.title}</h3>
                    <p className="text-sm text-muted-foreground">{currentTopic.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Audio Button */}
                    <Button
                      onClick={handlePlayAudio}
                      disabled={isLoadingAudio}
                      className={`w-16 h-16 rounded-full shadow-lg transition-all duration-200 ${
                        isLoadingAudio
                          ? 'bg-gray-600 cursor-not-allowed text-white border-2 border-gray-500'
                          : isPlayingAudio
                          ? 'bg-[#1582B4] hover:bg-[#1582B4]/90 text-white hover:scale-105 hover:shadow-xl'
                          : 'bg-[#1582B4] hover:bg-[#1582B4]/90 text-white hover:scale-105 hover:shadow-xl'
                      }`}
                      size="icon"
                    >
                      {isLoadingAudio ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      ) : isPlayingAudio ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>
                    
                    {/* Difficulty Badge */}
                    {(currentTopic.complexity || currentTopic.difficulty_level) && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 ${
                        (currentTopic.complexity === 'Expert' || currentTopic.difficulty_level === 'Expert')
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-orange-700 dark:text-orange-300'
                      }`}>
                        {currentTopic.complexity || currentTopic.difficulty_level}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          <div className="space-y-4">
            {conversation.map((message) => (
              <Card 
                key={message.id} 
                className={`transition-all duration-300 ${
                  message.sender === 'user' 
                    ? 'border-0 bg-gradient-to-br from-primary/20 to-primary/30 rounded-3xl shadow-lg overflow-hidden' 
                    : 'border-0 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-3xl shadow-lg overflow-hidden'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-br from-primary/20 to-primary/30 border border-primary/30' 
                        : 'bg-gradient-to-br from-[#1582B4]/20 to-[#1582B4]/30 border border-[#1582B4]/30'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="h-6 w-6 text-primary" />
                      ) : (
                        <Bot className="h-6 w-6 text-[#1582B4]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-sm font-medium ${
                          message.sender === 'user' 
                            ? 'text-primary' 
                            : 'text-[#1582B4]'
                        }`}>
                          {message.sender === 'user' ? 'You' : 'AI Guide'}
                        </span>
                        {message.responseTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{message.responseTime}s</span>
                          </div>
                        )}
                      </div>
                      <p className="text-foreground">
                        {message.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Expected Keywords Section */}
          {currentTopic && currentTopic.expected_keywords && currentTopic.expected_keywords.length > 0 && (
            <div>
              <Card className="border-0 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-3xl shadow-lg overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#1582B4]/20 to-[#1582B4]/30 rounded-xl flex items-center justify-center border border-[#1582B4]/30">
                      <Zap className="h-4 w-4 text-[#1582B4]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#1582B4] mb-3">Expected Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentTopic.expected_keywords.map((keyword, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-foreground text-sm rounded-full border border-gray-200/60 dark:border-gray-700/60"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <p className="text-muted-foreground text-sm mt-3">
                        Try to incorporate these keywords naturally in your conversation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Evaluation Loading State */}
          {isEvaluating && (
            <Card className="border-0 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-10 w-10 animate-spin text-[#1582B4]" />
                  <div>
                    <h4 className="font-medium text-[#1582B4]">Evaluating Your Response</h4>
                    <p className="text-muted-foreground text-sm">
                      Please wait while we analyze your speech...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results */}
          {evaluationResult && !isEvaluating && (
            <Card className="border-0 bg-gradient-to-br from-[#1582B4]/10 to-indigo-50 dark:from-[#1582B4]/20 dark:to-indigo-900/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <h4 className="font-medium text-[#1582B4] mb-4 text-lg">Evaluation Results</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1582B4]">
                      {evaluationResult.overall_score || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Overall</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1582B4]">
                      {evaluationResult.fluency_score || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Fluency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1582B4]">
                      {evaluationResult.vocabulary_score || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Vocabulary</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1582B4]">
                      {evaluationResult.content_relevance_score || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Relevance</div>
                  </div>
                </div>

                {evaluationResult.feedback && (
                  <div className="mb-4">
                    <h5 className="font-medium text-[#1582B4] mb-2">Feedback</h5>
                    <p className="text-sm text-muted-foreground">{evaluationResult.feedback}</p>
                  </div>
                )}

                {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-[#1582B4] mb-2">Strengths</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {evaluationResult.strengths.map((strength: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-[#1582B4] mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluationResult.areas_for_improvement && evaluationResult.areas_for_improvement.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-[#1582B4] mb-2">Areas for Improvement</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {evaluationResult.areas_for_improvement.map((area: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-center">
                  <Button
                    onClick={() => setEvaluationResult(null)}
                    variant="outline"
                    className="hover:bg-accent hover:text-accent-foreground transition-colors duration-200 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60"
                  >
                    Continue Practice
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          <div className="text-center">
            {!isRecording && !isEvaluating ? (
              <Button
                onClick={handleStartRecording}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                size="lg"
                disabled={!currentTopic}
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
            ) : (
              <Button
                disabled
                className="bg-gray-500 text-white px-8 py-3 rounded-full text-lg font-medium cursor-not-allowed"
                size="lg"
              >
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Evaluating...
              </Button>
            )}

            <div className="mt-4 space-y-3">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={resetSession}
                  variant="outline"
                  className="px-6 py-2 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Choose Different Topic
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/practice/stage-6')}
                  variant="outline"
                  className="px-6 py-2 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Back to Stage 6
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 