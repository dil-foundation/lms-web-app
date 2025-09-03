import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Users, User, Heart, Shield, AlertTriangle, Loader2, Zap, Play, Pause, Target, MessageSquare } from 'lucide-react';
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-primary font-medium">Loading sensitive scenario scenarios...</p>
          </CardContent>
        </Card>
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
                onClick={() => navigate('/dashboard/practice/stage-6')}
                className="absolute left-0 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </Button>
              
              <div className="space-y-2 sm:space-y-3 px-12 sm:px-0">
                <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sensitive Scenario Roleplay
                </h1>
                <p className="text-muted-foreground text-base sm:text-lg">
                  Practice handling sensitive situations with empathy and communication skills
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-4 sm:px-6 pb-8 space-y-6">
            {/* Scenario Selection */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm sm:text-lg">Click on a scenario to start the roleplay immediately</p>
            </div>

            {scenarios.length > 0 ? (
              <div className="space-y-4">
                {scenarios.map((scenario) => (
                  <Card 
                    key={scenario.id}
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden"
                    onClick={() => handleScenarioClick(scenario)}
                  >
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center flex-shrink-0 border border-primary/30">
                          <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="font-semibold text-primary text-sm sm:text-base">Context:</span> {scenario.context}
                            </div>
                            {(scenario.difficulty || scenario.difficulty_level) && (
                              <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ml-3 sm:ml-4 flex-shrink-0 border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm ${
                                (scenario.difficulty === 'Advanced' || scenario.difficulty_level === 'Advanced')
                                  ? 'text-red-600 dark:text-red-400' 
                                  : (scenario.difficulty === 'Intermediate' || scenario.difficulty_level === 'Intermediate')
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-green-600 dark:text-green-400'
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
              <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-primary mb-2">No Scenarios Available</h4>
                  <p className="text-muted-foreground text-base">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Roleplay Guidelines */}
            <Card className="border-0 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 text-primary">Roleplay Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Focus on emotional intelligence and empathy in your responses
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Use diplomatic language and consider cultural sensitivities
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Practice active listening and validate others' perspectives
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-base">
                      Aim for win-win solutions and constructive outcomes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning Notice */}
            <Card className="border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mt-1">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-lg">
                      Sensitive Content Notice
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-base">
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
              onClick={resetRoleplay}
              className="absolute left-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="space-y-3">
              <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Sensitive Scenario Roleplay
              </h1>
              <p className="text-muted-foreground text-lg">
                Practice handling sensitive situations with empathy and communication skills
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-6 pb-8 space-y-6">

                      {/* Current Scenario */}
            {selectedScenario && (
              <div className="mb-6 space-y-4">
                {/* Scenario Header */}
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2 sm:mb-3">
                          {selectedScenario.title}
                        </h2>
                        {selectedScenario.description && (
                          <p className="text-muted-foreground mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">
                            {selectedScenario.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0 flex items-center space-x-3">
                        {/* Audio Button */}
                        <Button
                          onClick={handlePlayAudio}
                          disabled={isLoadingAudio}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg transition-all duration-300 ${
                            isLoadingAudio
                              ? 'bg-gray-600 cursor-not-allowed text-white border-2 border-gray-500'
                              : isPlayingAudio
                              ? 'bg-[#1582B4] hover:bg-[#1582B4]/90 text-white hover:scale-105'
                              : 'bg-[#1582B4] hover:bg-[#1582B4]/90 text-white hover:scale-105'
                          }`}
                          size="icon"
                        >
                          {isLoadingAudio ? (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          ) : isPlayingAudio ? (
                            <Pause className="w-7 h-7 sm:w-8 sm:h-8" />
                          ) : (
                            <Play className="w-7 h-7 sm:w-8 sm:h-8" />
                          )}
                        </Button>
                        
                        {/* Difficulty Badge */}
                        {(selectedScenario.difficulty || selectedScenario.difficulty_level) && (
                          <span className={`px-4 py-2 rounded-full text-sm font-medium border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm ${
                            (selectedScenario.difficulty === 'Advanced' || selectedScenario.difficulty_level === 'Advanced')
                              ? 'text-red-600 dark:text-red-400' 
                              : (selectedScenario.difficulty === 'Intermediate' || selectedScenario.difficulty_level === 'Intermediate')
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {selectedScenario.difficulty || selectedScenario.difficulty_level}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scenario Section */}
                    {(selectedScenario as any).scenario && (
                      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-4 rounded-2xl border border-primary/20 mb-4">
                        <h3 className="font-semibold text-primary mb-2 flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mr-3 border border-primary/30">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          Scenario
                        </h3>
                        <p className="text-muted-foreground">
                          {(selectedScenario as any).scenario}
                        </p>
                      </div>
                    )}
                    
                    {/* Your Role Section */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-4 rounded-2xl border border-primary/20">
                      <h3 className="font-semibold text-primary mb-2 flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mr-3 border border-primary/30">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        Your Role
                      </h3>
                      <p className="text-muted-foreground">
                        {selectedScenario.context}
                      </p>
                    </div>
                  </CardContent>
                </Card>

              {/* Expected Keywords Section */}
              {selectedScenario.expected_keywords && selectedScenario.expected_keywords.length > 0 && (
                <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mt-1 border border-primary/30">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1582B4] mb-2 sm:mb-3 text-base sm:text-lg">
                          Expected Keywords & Concepts
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedScenario.expected_keywords.map((keyword, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-[#1582B4] text-xs sm:text-sm rounded-full border border-primary/30 font-medium"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm sm:text-base">
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
            <Card className="mb-6 border-0 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl shadow-lg overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-10 w-10 animate-spin text-[#1582B4]" />
                  <div>
                    <h4 className="font-medium text-[#1582B4] text-lg">Evaluating Your Response</h4>
                    <p className="text-muted-foreground text-base">
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

          {/* Action Buttons Section */}
          <div className="text-center space-y-6">
            {/* Primary Action Button */}
            <div className="flex justify-center">
            {!isRecording && !isEvaluating ? (
              <Button
                onClick={handleStartRecording}
                  className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white w-full sm:w-auto px-10 sm:px-12 py-3 sm:py-4 rounded-2xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                size="lg"
                disabled={!selectedScenario}
              >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-all duration-300">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                Start Conversation
              </Button>
            ) : isRecording ? (
              <Button
                onClick={handleStopRecording}
                  className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white w-full sm:w-auto px-10 sm:px-12 py-3 sm:py-4 rounded-2xl text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                size="lg"
              >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-all duration-300">
                    <Mic className="h-4 w-4 text-white" />
                  </div>
                Stop Recording
              </Button>
            ) : null}
            </div>

            {/* Secondary Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                <Button
                  onClick={resetRoleplay}
                  variant="outline"
                className="group w-full sm:w-auto px-8 py-3 rounded-2xl border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg font-medium text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10"
                >
                <Users className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Choose Different Scenario
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/practice/stage-6')}
                  variant="outline"
                className="group w-full sm:w-auto px-8 py-3 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg font-medium text-secondary hover:bg-gradient-to-r hover:from-secondary/5 hover:to-secondary/10"
                >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                  Back to Stage 6
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 