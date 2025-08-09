import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Users, User, Heart, Shield, AlertTriangle, Loader2, Zap, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  sensitiveScenarioService, 
  SensitiveScenario,
  SensitiveScenarioEvaluation
} from '@/services/sensitiveScenarioService';
import { useAuth } from '@/contexts/AuthContext';

interface RoleplayMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  role: string;
  timestamp: Date;
  emotionalTone?: string;
}

export default function SensitiveScenarioRoleplay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [scenarios, setScenarios] = useState<SensitiveScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SensitiveScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SensitiveScenarioEvaluation | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);

  // Load scenarios on component mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        setLoading(true);
        const fetchedScenarios = await sensitiveScenarioService.getAllScenarios();
        setScenarios(fetchedScenarios);
        
        // Set first scenario as default if available
        if (fetchedScenarios.length > 0) {
          setSelectedScenario(fetchedScenarios[0]);
        }
      } catch (error) {
        console.error('Error loading scenarios:', error);
        toast.error('Failed to load sensitive scenario scenarios');
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  }, []);

  const [conversation, setConversation] = useState<RoleplayMessage[]>([]);

  const handleScenarioClick = (scenario: SensitiveScenario) => {
    setSelectedScenario(scenario);
    setHasStarted(true);
    setShowFeedback(true);
  };

  const handleStartRoleplay = () => {
    setHasStarted(true);
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
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
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

  const resetRoleplay = () => {
    setHasStarted(false);
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
    if (!selectedScenario) return;

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
      const audioUrl = await sensitiveScenarioService.getScenarioAudio(selectedScenario.id);
      
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
    
    if (!selectedScenario || !user) {
      console.error('Missing scenario or user:', { selectedScenario: !!selectedScenario, user: !!user });
      toast.error('Missing scenario or user information');
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
      const filename = `sensitive_scenario_${selectedScenario.id}_${Date.now()}.wav`;
      console.log('Calling evaluation API with:', {
        scenarioId: selectedScenario.id,
        filename,
        userId: user.id,
        timeSpentSeconds,
        audioLength: base64Audio.length
      });
      
      const evaluation = await sensitiveScenarioService.evaluateSensitiveScenario(
        base64Audio,
        selectedScenario.id,
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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sensitive scenario scenarios...</p>
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
              onClick={() => navigate('/dashboard/practice/stage-6')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Sensitive Scenario
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Roleplay Scenario</h2>
              <p className="text-muted-foreground">Click on a scenario to start the roleplay immediately</p>
            </div>

            {scenarios.length > 0 ? (
              <div className="space-y-4">
                {scenarios.map((scenario) => (
                  <Card 
                    key={scenario.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-green-500"
                    onClick={() => handleScenarioClick(scenario)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-medium text-green-600 dark:text-green-400 text-sm">Context:</span> {scenario.context}
                            </div>
                            {(scenario.difficulty || scenario.difficulty_level) && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ml-4 flex-shrink-0 ${
                                (scenario.difficulty === 'Advanced' || scenario.difficulty_level === 'Advanced')
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                  : (scenario.difficulty === 'Intermediate' || scenario.difficulty_level === 'Intermediate')
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {scenario.difficulty || scenario.difficulty_level}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-muted-foreground mb-2">No Scenarios Available</h4>
                  <p className="text-muted-foreground text-sm">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}



            {/* Roleplay Guidelines */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Roleplay Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Focus on emotional intelligence and empathy in your responses
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Use diplomatic language and consider cultural sensitivities
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Practice active listening and validate others' perspectives
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Aim for win-win solutions and constructive outcomes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Notice */}
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Sensitive Content Notice
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                      These scenarios involve complex emotional and professional situations. Practice with respect and cultural awareness.
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
            onClick={resetRoleplay}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Sensitive Scenario
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Current Scenario */}
        {selectedScenario && (
          <div className="mb-6 space-y-4">
            {/* Scenario Header */}
            <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-3">
                      {selectedScenario.title}
                    </h2>
                    {selectedScenario.description && (
                      <p className="text-green-700 dark:text-green-300 mb-4 leading-relaxed">
                        {selectedScenario.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-3">
                    {/* Audio Button */}
                    <Button
                      onClick={handlePlayAudio}
                      disabled={isLoadingAudio}
                      className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 ${
                        isLoadingAudio
                          ? 'bg-gray-600 cursor-not-allowed text-white border-2 border-gray-500'
                          : isPlayingAudio
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
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
                    {(selectedScenario.difficulty || selectedScenario.difficulty_level) && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        (selectedScenario.difficulty === 'Advanced' || selectedScenario.difficulty_level === 'Advanced')
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                          : (selectedScenario.difficulty === 'Intermediate' || selectedScenario.difficulty_level === 'Intermediate')
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {selectedScenario.difficulty || selectedScenario.difficulty_level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Scenario Section */}
                {(selectedScenario as any).scenario && (
                  <div className="bg-white/50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700 mb-4">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Scenario
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      {(selectedScenario as any).scenario}
                    </p>
                  </div>
                )}
                
                {/* Your Role Section */}
                <div className="bg-white/50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Your Role
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {selectedScenario.context}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Expected Keywords Section */}
            {selectedScenario.expected_keywords && selectedScenario.expected_keywords.length > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                        Expected Keywords & Concepts
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedScenario.expected_keywords.map((keyword, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-white dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-800 font-medium"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        Try to incorporate these concepts naturally in your responses to demonstrate professional communication skills.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}





        {/* Evaluation Loading State */}
        {isEvaluating && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">Evaluating Your Response</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Please wait while we analyze your communication skills...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Results */}
        {evaluationResult && !isEvaluating && (
          <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-green-600 dark:text-green-400">Communication Evaluation</h4>
                <Button
                  onClick={() => setEvaluationResult(null)}
                  variant="outline"
                  size="sm"
                  className="hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                >
                  Close
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {evaluationResult.overall_score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Overall</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {evaluationResult.fluency_score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Fluency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {evaluationResult.vocabulary_score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Vocabulary</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {evaluationResult.content_relevance_score || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Relevance</div>
                </div>
              </div>

              {evaluationResult.feedback && (
                <div className="mb-3">
                  <p className="text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                    {evaluationResult.feedback}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                  <div>
                    <h5 className="font-medium text-green-600 dark:text-green-400 mb-2 text-sm">Strengths</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {evaluationResult.strengths.slice(0, 3).map((strength: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluationResult.areas_for_improvement && evaluationResult.areas_for_improvement.length > 0 && (
                  <div>
                    <h5 className="font-medium text-orange-600 dark:text-orange-400 mb-2 text-sm">Areas for Improvement</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {evaluationResult.areas_for_improvement.slice(0, 3).map((area: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <div className="text-center">
          {!isRecording && !isEvaluating ? (
            <Button
              onClick={handleStartRecording}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
              disabled={!selectedScenario}
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Conversation
            </Button>
          ) : isRecording ? (
            <Button
              onClick={handleStopRecording}
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full text-lg font-medium"
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
                onClick={resetRoleplay}
                variant="outline"
                className="px-6 py-2"
              >
                Choose Different Scenario
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-6')}
                variant="outline"
                className="px-6 py-2"
              >
                Back to Stage 6
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 