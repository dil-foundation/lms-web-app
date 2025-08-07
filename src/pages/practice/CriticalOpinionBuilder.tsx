import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Lightbulb, FileText, Brain, Target, Loader2, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  criticalOpinionService, 
  CriticalOpinionTopic,
  CriticalOpinionEvaluation
} from '@/services/criticalOpinionService';



export default function CriticalOpinionBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [topics, setTopics] = useState<CriticalOpinionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<CriticalOpinionTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Audio playback states
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Recording and evaluation states
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<CriticalOpinionEvaluation | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);


  // Load topics on component mount
  useEffect(() => {
    const loadTopics = async () => {
      try {
        setLoading(true);
        const fetchedTopics = await criticalOpinionService.getAllTopics();
        setTopics(fetchedTopics);
        
        // Set first topic as default if available
        if (fetchedTopics.length > 0) {
          setSelectedTopic(fetchedTopics[0]);
        }
      } catch (error) {
        console.error('Error loading topics:', error);
        toast.error('Failed to load critical opinion topics');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);



  const handleTopicClick = (topic: CriticalOpinionTopic) => {
    setSelectedTopic(topic);
    setHasStarted(true);
    setShowFeedback(false);
  };

  // Audio playback functions
  const cleanupCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeEventListener('play', () => setIsPlayingAudio(true));
      currentAudio.removeEventListener('pause', () => setIsPlayingAudio(false));
      currentAudio.removeEventListener('ended', () => setIsPlayingAudio(false));
      setCurrentAudio(null);
    }
  };

  const handlePlayAudio = async () => {
    if (!selectedTopic) return;

    try {
      setIsLoadingAudio(true);
      cleanupCurrentAudio();

      const audioUrl = await criticalOpinionService.getTopicAudio(selectedTopic.id);
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('play', () => setIsPlayingAudio(true));
      audio.addEventListener('pause', () => setIsPlayingAudio(false));
      audio.addEventListener('ended', () => setIsPlayingAudio(false));
      
      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
    } finally {
      setIsLoadingAudio(false);
    }
  };



  const handleStartRecording = async () => {
    try {
      console.log('🎙️ Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        console.log('📊 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstart = () => {
        console.log('🎙️ Recording started');
        setRecordingStartTime(Date.now());
      };
      
      recorder.onerror = (event) => {
        console.error('❌ Recording error:', event);
        toast.error('Recording failed');
      };
      
      recorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        setRecordedChunks(chunks);
        handleEvaluateRecording(chunks);
      };
      
      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = () => {
    console.log('🛑 Stop recording requested');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const handleEvaluateRecording = async (chunks: Blob[]) => {
    if (!selectedTopic || !user?.id || chunks.length === 0) {
      console.error('❌ Missing data for evaluation:', { selectedTopic, userId: user?.id, chunks: chunks.length });
      return;
    }

    try {
      console.log('🔄 Starting evaluation...');
      setIsEvaluating(true);
      
      // Create audio blob
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      console.log('📊 Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        console.error('❌ Empty audio blob');
        toast.error('No audio recorded');
        return;
      }
      
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;
      
      // Calculate time spent
      const timeSpent = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 30;
      
      console.log('📤 Sending evaluation request...', {
        topicId: selectedTopic.id,
        userId: user.id,
        timeSpent,
        audioSize: audioBase64.length
      });
      
      // Call evaluation API
      const result = await criticalOpinionService.evaluateCriticalOpinion(
        audioBase64,
        selectedTopic.id,
        `critical_opinion_${selectedTopic.id}_${Date.now()}.webm`,
        user.id,
        timeSpent,
        false
      );
      
      console.log('✅ Evaluation result:', result);
      setEvaluationResult(result);
      setShowFeedback(true);
      
    } catch (error) {
      console.error('❌ Error evaluating recording:', error);
      toast.error('Failed to evaluate recording');
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetBuilder = () => {
    setHasStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
    setEvaluationResult(null);
    setIsEvaluating(false);
    setRecordedChunks([]);
    setRecordingStartTime(null);
    cleanupCurrentAudio();
    
    // Stop any ongoing recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setMediaRecorder(null);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading critical opinion topics...</p>
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
                Opinion Builder
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Opinion Topic</h2>
              <p className="text-muted-foreground">Click on a topic to start building your opinion immediately</p>
            </div>

            {topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topics.map((topic) => (
                  <Card 
                    key={topic.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-green-500"
                    onClick={() => handleTopicClick(topic)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <Lightbulb className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          {(topic.complexity || topic.difficulty_level) && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              (topic.complexity === 'Advanced' || topic.difficulty_level === 'Advanced')
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                : (topic.complexity === 'Intermediate' || topic.difficulty_level === 'Intermediate')
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {topic.complexity || topic.difficulty_level}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{topic.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{topic.description}</p>
                          <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                            {topic.category}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-muted-foreground mb-2">No Topics Available</h4>
                  <p className="text-muted-foreground text-sm">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}



            {/* Building Guidelines */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Opinion Building Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Develop a clear, well-reasoned position on the topic
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Support your arguments with evidence, examples, and logical reasoning
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Consider and address potential counterarguments
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Use sophisticated vocabulary and complex sentence structures
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
            onClick={resetBuilder}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Opinion Builder
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Current Topic */}
        {selectedTopic && (
          <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">{selectedTopic.title}</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-2">{selectedTopic.description}</p>
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                    {selectedTopic.category}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Audio Play Button */}
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
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  
                  {/* Difficulty Badge */}
                  {(selectedTopic.complexity || selectedTopic.difficulty_level) && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      (selectedTopic.complexity === 'Advanced' || selectedTopic.difficulty_level === 'Advanced')
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : (selectedTopic.complexity === 'Intermediate' || selectedTopic.difficulty_level === 'Intermediate')
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {selectedTopic.complexity || selectedTopic.difficulty_level}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}







        {/* Evaluation Loading State */}
        {isEvaluating && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Evaluating your critical opinion...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Results */}
        {evaluationResult && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Opinion Analysis</h3>
            <div className="space-y-4">
              {/* Overall Score */}
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-600 dark:text-green-400">Overall Score</h4>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {evaluationResult.overall_score}/100
                    </span>
                  </div>
                  {evaluationResult.feedback && (
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      {evaluationResult.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Strengths */}
              {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Strengths</h4>
                        <div className="space-y-1">
                          {evaluationResult.strengths.map((strength, index) => (
                            <p key={index} className="text-green-700 dark:text-green-300 text-sm">
                              • {strength}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Areas for Improvement */}
              {evaluationResult.areas_for_improvement && evaluationResult.areas_for_improvement.length > 0 && (
                <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mt-1">
                        <Brain className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Areas for Improvement</h4>
                        <div className="space-y-1">
                          {evaluationResult.areas_for_improvement.map((area, index) => (
                            <p key={index} className="text-orange-700 dark:text-orange-300 text-sm">
                              • {area}
                            </p>
                          ))}
                        </div>
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
          {isEvaluating ? (
            <Button
              disabled
              className="bg-gray-500 cursor-not-allowed text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
            >
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Evaluating...
            </Button>
          ) : !isRecording ? (
            <Button
              onClick={handleStartRecording}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recording Your Opinion
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

          <div className="mt-4 space-y-3">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={resetBuilder}
                variant="outline"
                className="px-6 py-2"
              >
                Choose Different Topic
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