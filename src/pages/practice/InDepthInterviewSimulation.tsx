import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { CompletionDialog } from '@/components/practice/CompletionDialog';
import { ArrowLeft, Mic, Building2, User, Star, TrendingUp, CheckCircle, Loader2, Play, Pause, Bot, Target, MessageSquare, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { toast } from 'sonner';
import { 
  inDepthInterviewService, 
  InDepthInterviewPrompt,
  InDepthInterviewEvaluationResponse 
} from '@/services/inDepthInterviewService';

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

export default function InDepthInterviewSimulation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [prompts, setPrompts] = useState<InDepthInterviewPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<InDepthInterviewPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [evaluation, setEvaluation] = useState<InDepthInterviewEvaluationResponse | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
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
    audioBlob,
    error: recordingError
  } = useAudioRecorder();

  // Load prompts on component mount
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoading(true);
        const fetchedPrompts = await inDepthInterviewService.getAllPrompts();

        setPrompts(fetchedPrompts);
      } catch (error) {
        console.error('Error loading prompts:', error);
        toast.error('Failed to load interview prompts');
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
  }, []);

  // Handle audio recording error
  useEffect(() => {
    if (recordingError) {
      toast.error('Recording error: ' + recordingError);
    }
  }, [recordingError]);

  // Handle audio blob when recording stops
  useEffect(() => {
    if (audioBlob && startTime && selectedPrompt && user) {
      handleEvaluateResponse();
    }
  }, [audioBlob]);

  const handlePromptSelect = (prompt: InDepthInterviewPrompt) => {
    setSelectedPrompt(prompt);
    setHasStarted(false);
    setEvaluation(null);
    setAudioUrl(null);
    stopAudio();
  };

  const handleStartInterview = () => {
    setHasStarted(true);
  };

  const handlePlayAudio = async () => {
    if (!selectedPrompt) return;

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
      const audioResponse = await inDepthInterviewService.getPromptAudio(selectedPrompt.id);
      if (audioResponse.audio_url) {
        setAudioUrl(audioResponse.audio_url);
        await playAudio(audioResponse.audio_url);
        console.log('✅ Audio fetched and playing:', audioResponse.audio_url);
      }
    } catch (error) {
      console.error('Error loading and playing audio:', error);
      toast.error('Failed to load and play audio. Please try again.');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStartRecording = async () => {
    if (!selectedPrompt) {
      toast.error('Please select a prompt first');
      return;
    }

    try {
      setStartTime(new Date());
      setHasStarted(true); // Move to interview mode
      await startRecording();
      toast.success('Recording started! Begin your response.');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
      toast.info('Recording stopped. Processing your response...');
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  const handleEvaluateResponse = async () => {
    if (!audioBlob || !selectedPrompt || !user || !startTime) {
      return;
    }

    try {
      setIsEvaluating(true);
      
      const timeSpentSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      const audioBase64 = await inDepthInterviewService.audioToBase64(audioBlob);
      const filename = inDepthInterviewService.generateFilename(selectedPrompt.id, user.id);

      const evaluationData = {
        audio_base64: audioBase64,
        prompt_id: selectedPrompt.id,
        filename: filename,
        user_id: user.id,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: false // This would be determined by the API
      };

      const result = await inDepthInterviewService.evaluateResponse(evaluationData) as any;
      
      // Handle API error responses (like no_speech_detected)
      if (result.success === false || result.error) {
        const errorMessage = result.message || result.error || 'Speech evaluation failed';
        
        // Create modified feedback object for error cases
        const errorFeedback = {
          ...result,
          evaluation: {
            ...result.evaluation,
            evaluation: {
              ...result.evaluation?.evaluation,
              overall_score: 0,
              feedback: errorMessage,
              suggested_improvements: ['Please speak more clearly and try again']
            }
          }
        };
        
        setEvaluation(errorFeedback);
        toast.error('Speech evaluation failed: ' + errorMessage);
        return;
      }
      
      setEvaluation(result);
      toast.success('Response evaluated successfully!');
      
      // Check if the exercise is completed based on API response
      if (result?.exercise_completion?.exercise_completed) {
        // Exercise is completed according to the API
        setIsCompleted(true);
        setShowCompletionDialog(true);
      }
    } catch (error) {
      console.error('Error evaluating response:', error);
      toast.error('Failed to evaluate response');
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetInterview = () => {
    setHasStarted(false);
    setEvaluation(null);
    setStartTime(null);
    setSelectedPrompt(null); // Allow user to choose a different prompt
    setAudioUrl(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    stopAudio();
  };

  const handleRedo = () => {
    setShowCompletionDialog(false);
    setIsCompleted(false);
    setHasStarted(false);
    setEvaluation(null);
    setStartTime(null);
    setAudioUrl(null);
    stopAudio();
  };

  const handleContinue = () => {
    setShowCompletionDialog(false);
    resetInterview();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-primary font-medium">Loading interview prompts...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedPrompt) {
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
                onClick={() => navigate('/dashboard/practice/stage-5')}
                className="absolute left-0 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </Button>
              
              <div className="space-y-2 sm:space-y-3 px-12 sm:px-0">
                <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  In-Depth Interview
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Practice professional interview scenarios with detailed feedback
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Selection */}
          <div className="px-6 pb-8 space-y-4">
            <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">
              Choose Your Interview Prompt
            </h2>
            

            {prompts.length > 0 ? (
              prompts.map((prompt) => (
              <Card 
                  key={prompt.id}
                  className="cursor-pointer border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                  onClick={() => handlePromptSelect(prompt)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center border border-primary/30">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 text-primary">{prompt.title || prompt.question}</h3>
                        <p className="text-muted-foreground text-sm">{prompt.description || prompt.category}</p>
                        {prompt.difficulty_level && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-primary/20 text-primary">
                              {prompt.difficulty_level}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            ) : (
              <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-muted-foreground mb-2">No Prompts Available</h4>
                  <p className="text-muted-foreground text-sm">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
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
                  stopAudio();
                  setSelectedPrompt(null);
                }}
                className="absolute left-0 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </Button>
              
              <div className="space-y-2 sm:space-y-3 px-12 sm:px-0">
                <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  In-Depth Interview
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Practice professional interview scenarios with detailed feedback
                </p>
              </div>
            </div>
          </div>

          {/* Selected Prompt */}
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden mb-6">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  {selectedPrompt.title || selectedPrompt.question}
                </h3>
                <p className="text-primary/80 text-sm mb-4">
                  {selectedPrompt.description || selectedPrompt.category}
                </p>
                
                {/* Expected Keywords */}
                {selectedPrompt.expected_keywords && selectedPrompt.expected_keywords.length > 0 && (
                  <div className="mt-4 mb-4">
                    <h4 className="text-sm font-medium text-primary mb-2">Expected Keywords:</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {selectedPrompt.expected_keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-primary/20 text-primary text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Audio Play Button */}
                <div className="mt-4 mb-4 flex justify-center">
                  <button
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className="w-16 h-16 bg-gradient-to-r from-[#1582B4] to-[#1582B4]/90 hover:from-[#1582B4]/90 hover:to-[#1582B4] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#1582B4]/40 focus:ring-offset-2"
                    title={isLoadingAudio ? "Loading audio..." : audioState.isPlaying ? "Pause audio" : "Play audio"}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : audioState.isPlaying ? (
                      <Pause className="h-6 w-6 text-white ml-0" />
                    ) : (
                      <Play className="h-6 w-6 text-white ml-0.5" />
                    )}
                  </button>
                </div>
                
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      stopAudio();
                      setSelectedPrompt(null);
                    }}
                    className="border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 text-primary hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Change Prompt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview Guidelines */}
          <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-primary">Interview Guidelines</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Use the STAR method (Situation, Task, Action, Result) to structure your response
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Provide specific examples and concrete details
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Speak clearly and maintain professional tone
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Aim for 2-3 minutes of response time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Loading */}
          {isEvaluating && (
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-[#1582B4]" />
                  <h3 className="text-lg font-semibold text-[#1582B4] mb-2">
                    Evaluating Your Response
                  </h3>
                  <p className="text-[#1582B4]/80 text-sm">
                    Please wait while we analyze your interview response...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results */}
          {evaluation && evaluation.evaluation && !hasStarted && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">
                Interview Feedback
              </h3>

              <div className="space-y-4">
                {/* Overall Score */}
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold mb-2 ${
                        (evaluation?.evaluation?.evaluation?.overall_score || 0) === 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent'
                      }`}>
                        {evaluation?.evaluation?.evaluation?.overall_score || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                  </CardContent>
                </Card>

                {/* STAR Model Feedback */}
                {evaluation?.evaluation?.evaluation?.star_feedback && (
                  <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                          <Star className="h-4 w-4 text-[#1582B4]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#1582B4] mb-2">STAR Model Usage</h4>
                          <p className="text-[#1582B4]/80 text-sm">
                            {evaluation.evaluation.evaluation.star_feedback}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suggested Improvements */}
                {evaluation?.evaluation?.evaluation?.suggested_improvements &&
                 Array.isArray(evaluation.evaluation.evaluation.suggested_improvements) &&
                 evaluation.evaluation.evaluation.suggested_improvements.length > 0 && (
                  <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-primary mb-2">Suggested Improvements</h4>
                          <ul className="space-y-1">
                            {evaluation.evaluation.evaluation.suggested_improvements.map((suggestion, index) => (
                              <li key={index} className="text-primary/80 text-sm">
                                • {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Encouragement */}
                {evaluation?.evaluation?.evaluation?.encouragement && (
                  <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                          <CheckCircle className="h-4 w-4 text-[#1582B4]" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-[#1582B4] mb-2">Encouragement</h4>
                          <p className="text-[#1582B4]/80 text-sm">
                            {evaluation.evaluation.evaluation.encouragement}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          <div className="text-center">
            {evaluation ? (
              <Button
                onClick={resetInterview}
                variant="outline"
                className="px-6 py-2 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 text-primary hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Try Another Prompt
              </Button>
            ) : !isRecording ? (
              <Button
                onClick={handleStartRecording}
                disabled={isEvaluating}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={handleStopRecording}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                if (evaluation) {
                  // If viewing evaluation, go back to prompt selection
                  setSelectedPrompt(null);
                  setHasStarted(false);
                  setEvaluation(null);
                  setStartTime(null);
                  setAudioUrl(null);
                  stopAudio();
                } else {
                  // If in interview, go back to prompt selection
                  setSelectedPrompt(null);
                  setHasStarted(false);
                  setAudioUrl(null);
                  stopAudio();
                }
              }}
              className="absolute left-0 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-2 sm:space-y-3 px-12 sm:px-0">
              <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                In-Depth Interview
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Practice professional interview scenarios with detailed feedback
                </p>
            </div>
          </div>
        </div>

        {/* Current Prompt */}
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden mb-6">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center border border-primary/30">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {selectedPrompt.title || selectedPrompt.question}
                </h3>
                <p className="text-primary/80 text-sm">
                  {selectedPrompt.description || selectedPrompt.category}
                </p>
                {selectedPrompt.prompt_text && (
                  <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-primary/20">
                    <p className="text-primary text-sm font-medium">
                      {selectedPrompt.prompt_text}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Loading */}
        {isEvaluating && (
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-[#1582B4]" />
                <h3 className="text-lg font-semibold text-[#1582B4] mb-2">
                  Evaluating Your Response
                </h3>
                <p className="text-[#1582B4]/80 text-sm">
                  Please wait while we analyze your interview response...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Results */}
        {evaluation && evaluation.evaluation && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-6 bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent">
              Interview Feedback
            </h3>

            <div className="space-y-4">
              {/* Overall Score */}
              <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${
                      (evaluation?.evaluation?.evaluation?.overall_score || 0) === 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'bg-gradient-to-r from-primary to-[#1582B4] bg-clip-text text-transparent'
                    }`}>
                      {evaluation?.evaluation?.evaluation?.overall_score || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                </CardContent>
              </Card>

              {/* STAR Model Feedback */}
              {evaluation?.evaluation?.evaluation?.star_feedback && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <Star className="h-4 w-4 text-[#1582B4]" />
                  </div>
                  <div className="flex-1">
                        <h4 className="font-medium text-[#1582B4] mb-2">STAR Model Usage</h4>
                        <p className="text-[#1582B4]/80 text-sm">
                          {evaluation.evaluation.evaluation.star_feedback}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vocabulary Suggestions */}
              {evaluation?.evaluation?.evaluation?.vocabulary_suggestions && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-primary mb-2">Vocabulary Enhancement</h4>
                        <p className="text-primary/80 text-sm">
                          {evaluation.evaluation.evaluation.vocabulary_suggestions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
              )}

              {/* Fluency Feedback */}
              {evaluation?.evaluation?.evaluation?.fluency_feedback && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <CheckCircle className="h-4 w-4 text-[#1582B4]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-[#1582B4] mb-2">Fluency & Precision</h4>
                        <p className="text-[#1582B4]/80 text-sm">
                          {evaluation.evaluation.evaluation.fluency_feedback}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Keywords Used */}
              {evaluation?.evaluation?.evaluation?.keyword_matches && 
               Array.isArray(evaluation.evaluation.evaluation.keyword_matches) &&
               evaluation.evaluation.evaluation.keyword_matches.length > 0 && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-primary mb-2">
                          Keywords Used ({evaluation?.evaluation?.evaluation?.matched_keywords_count || 0} / {evaluation?.evaluation?.evaluation?.total_keywords || 0})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {evaluation.evaluation.evaluation.keyword_matches.map((keyword, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-primary/20 text-primary text-xs rounded-full"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Suggested Improvements */}
              {evaluation?.evaluation?.evaluation?.suggested_improvements &&
               Array.isArray(evaluation.evaluation.evaluation.suggested_improvements) &&
               evaluation.evaluation.evaluation.suggested_improvements.length > 0 && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <Bot className="h-4 w-4 text-[#1582B4]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-[#1582B4] mb-2">Suggested Improvements</h4>
                        <ul className="space-y-1">
                          {evaluation.evaluation.evaluation.suggested_improvements.map((suggestion, index) => (
                            <li key={index} className="text-[#1582B4]/80 text-sm">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              {evaluation?.evaluation?.evaluation?.next_steps && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-primary mb-2">Next Steps</h4>
                        <p className="text-primary/80 text-sm">
                          {evaluation.evaluation.evaluation.next_steps}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Encouragement */}
              {evaluation?.evaluation?.evaluation?.encouragement && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mt-1 border border-primary/30">
                        <CheckCircle className="h-4 w-4 text-[#1582B4]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-[#1582B4] mb-2">Encouragement</h4>
                        <p className="text-[#1582B4]/80 text-sm">
                          {evaluation.evaluation.evaluation.encouragement}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="text-center">
          {!evaluation ? (
            !isRecording ? (
            <Button
              onClick={handleStartRecording}
                disabled={isEvaluating}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
                Start Recording
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
            )
          ) : (
            <div className="text-center">
              <Button
                onClick={resetInterview}
                variant="outline"
                className="px-6 py-2 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 text-primary hover:bg-white/80 dark:hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Try Another Prompt
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        exerciseName="In-Depth Interview"
        score={evaluation?.evaluation?.evaluation?.overall_score || 0}
        onRedo={handleRedo}
        onContinue={handleContinue}
      />
    </div>
  );
} 