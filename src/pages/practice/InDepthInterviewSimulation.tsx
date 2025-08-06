import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Building2, User, Star, TrendingUp, CheckCircle, Loader2, Play, Pause, Bot } from 'lucide-react';
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

      const result = await inDepthInterviewService.evaluateResponse(evaluationData);
      setEvaluation(result);
      toast.success('Response evaluated successfully!');
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
    stopAudio();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading interview prompts...</p>
        </div>
      </div>
    );
  }

  if (!selectedPrompt) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-5')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
                In-Depth Interview
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Prompt Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Choose Your Interview Prompt</h2>
            

            {prompts.length > 0 ? (
              prompts.map((prompt) => (
              <Card 
                  key={prompt.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={() => handlePromptSelect(prompt)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{prompt.title || prompt.question}</h3>
                        <p className="text-muted-foreground text-sm">{prompt.description || prompt.category}</p>
                        {prompt.difficulty_level && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
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
              <Card className="bg-muted/50">
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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedPrompt(null)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
                In-Depth Interview
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Selected Prompt */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mb-6">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                  {selectedPrompt.title || selectedPrompt.question}
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm mb-4">
                  {selectedPrompt.description || selectedPrompt.category}
                </p>
                
                {/* Expected Keywords */}
                {selectedPrompt.expected_keywords && selectedPrompt.expected_keywords.length > 0 && (
                  <div className="mt-4 mb-4">
                    <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Expected Keywords:</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {selectedPrompt.expected_keywords.map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full"
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
                
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPrompt(null)}
                    className="text-green-600 border-green-300 hover:bg-green-100"
                  >
                    Change Prompt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview Guidelines */}
          <Card className="bg-muted/50 mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Interview Guidelines</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Use the STAR method (Situation, Task, Action, Result) to structure your response
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Provide specific examples and concrete details
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Speak clearly and maintain professional tone
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <p className="text-muted-foreground text-sm">
                    Aim for 2-3 minutes of response time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Loading */}
          {isEvaluating && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Evaluating Your Response
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Please wait while we analyze your interview response...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Evaluation Results */}
          {evaluation && evaluation.evaluation && !hasStarted && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Interview Feedback</h3>

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

                {/* STAR Model Feedback */}
                {evaluation?.evaluation?.evaluation?.star_feedback && (
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mt-1">
                          <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">STAR Model Usage</h4>
                          <p className="text-yellow-700 dark:text-yellow-300 text-sm">
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

                {/* Encouragement */}
                {evaluation?.evaluation?.evaluation?.encouragement && (
                  <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mt-1">
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-2">Encouragement</h4>
                          <p className="text-emerald-700 dark:text-emerald-300 text-sm">
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
                className="px-6 py-2"
              >
                Try Another Prompt
              </Button>
            ) : !isRecording ? (
              <Button
                onClick={handleStartRecording}
                disabled={isEvaluating}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={handleStopRecording}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium"
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PracticeBreadcrumb />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              In-Depth Interview
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Current Prompt */}
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 mb-6">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  {selectedPrompt.title || selectedPrompt.question}
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  {selectedPrompt.description || selectedPrompt.category}
                </p>
                {selectedPrompt.prompt_text && (
                  <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">
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
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-6">
            <CardContent className="p-6">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Evaluating Your Response
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Please wait while we analyze your interview response...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Results */}
        {evaluation && evaluation.evaluation && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Interview Feedback</h3>

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

              {/* STAR Model Feedback */}
              {evaluation?.evaluation?.evaluation?.star_feedback && (
                <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mt-1">
                        <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                        <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">STAR Model Usage</h4>
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                          {evaluation.evaluation.evaluation.star_feedback}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vocabulary Suggestions */}
              {evaluation?.evaluation?.evaluation?.vocabulary_suggestions && (
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mt-1">
                        <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-2">Vocabulary Enhancement</h4>
                        <p className="text-purple-700 dark:text-purple-300 text-sm">
                          {evaluation.evaluation.evaluation.vocabulary_suggestions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
              )}

              {/* Fluency Feedback */}
              {evaluation?.evaluation?.evaluation?.fluency_feedback && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Fluency & Precision</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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

              {/* Next Steps */}
              {evaluation?.evaluation?.evaluation?.next_steps && (
                <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mt-1">
                        <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-indigo-600 dark:text-indigo-400 mb-2">Next Steps</h4>
                        <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                          {evaluation.evaluation.evaluation.next_steps}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Encouragement */}
              {evaluation?.evaluation?.evaluation?.encouragement && (
                <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mt-1">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-2">Encouragement</h4>
                        <p className="text-emerald-700 dark:text-emerald-300 text-sm">
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
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
                Start Recording
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium"
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
                className="px-6 py-2"
              >
                Try Another Prompt
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 