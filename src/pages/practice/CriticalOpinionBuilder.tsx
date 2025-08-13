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
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-muted-foreground text-lg font-medium">Loading critical opinion topics...</p>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <PracticeBreadcrumb />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard/practice/stage-6')}
              className="shrink-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
            </Button>
            
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                Critical Opinion Builder
              </h1>
              <p className="text-muted-foreground text-lg">Develop sophisticated viewpoints with AI guidance</p>
            </div>
            
            <div className="w-12"></div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-8">
            <div className="text-center">
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Click on a topic to start building your opinion immediately with our AI-powered guidance system
              </p>
            </div>

            {topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => (
                  <Card 
                    key={topic.id}
                    className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-2xl overflow-hidden"
                    onClick={() => handleTopicClick(topic)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                            <Lightbulb className="h-7 w-7 text-white" />
                          </div>
                          {(topic.complexity || topic.difficulty_level) && (
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md ${
                              (topic.complexity === 'Advanced' || topic.difficulty_level === 'Advanced')
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                                : (topic.complexity === 'Intermediate' || topic.difficulty_level === 'Intermediate')
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                                : 'bg-gradient-to-r from-primary to-primary/80 text-white'
                            }`}>
                              {topic.complexity || topic.difficulty_level}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-300">
                            {topic.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {topic.description}
                          </p>
                          <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/20 text-primary border border-primary/20">
                            {topic.category}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gradient-to-br from-muted/30 to-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lightbulb className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h4 className="text-xl font-semibold text-muted-foreground mb-3">No Topics Available</h4>
                  <p className="text-muted-foreground text-base max-w-md mx-auto">
                    Please check back later or contact support if this issue persists.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Building Guidelines */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-2xl shadow-xl">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Opinion Building Guidelines</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-base leading-relaxed">
                      Develop a clear, well-reasoned position on the topic
                    </p>
                  </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-base leading-relaxed">
                      Support your arguments with evidence, examples, and logical reasoning
                    </p>
                  </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-base leading-relaxed">
                      Consider and address potential counterarguments
                    </p>
                  </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-primary to-primary/80 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-muted-foreground text-base leading-relaxed">
                      Use sophisticated vocabulary and complex sentence structures
                    </p>
                    </div>
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
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <PracticeBreadcrumb />
        </div>
        
        {/* Integrated Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={resetBuilder}
            className="shrink-0 group w-12 h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" />
          </Button>
          
          <div className="text-center flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Current Session
            </h2>
            <p className="text-sm text-muted-foreground">Recording and evaluation mode</p>
          </div>
          
          <div className="w-12"></div>
        </div>

        {/* Current Topic */}
        {selectedTopic && (
          <Card className="mb-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">
                    {selectedTopic.title}
                  </h3>
                  <p className="text-base text-muted-foreground mb-3 leading-relaxed">
                    {selectedTopic.description}
                  </p>
                  <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary/10 to-primary/20 text-primary border border-primary/20">
                    {selectedTopic.category}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Audio Play Button */}
                  <Button
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className={`w-14 h-14 rounded-2xl shadow-xl transition-all duration-300 ${
                      isLoadingAudio
                        ? 'bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed text-white border-2 border-slate-500'
                        : isPlayingAudio
                        ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white hover:shadow-2xl'
                        : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white hover:shadow-2xl hover:scale-105'
                    }`}
                    size="icon"
                  >
                    {isLoadingAudio ? (
                      <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : isPlayingAudio ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </Button>
                  
                  {/* Difficulty Badge */}
                  {(selectedTopic.complexity || selectedTopic.difficulty_level) && (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md ${
                      (selectedTopic.complexity === 'Advanced' || selectedTopic.difficulty_level === 'Advanced')
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                        : (selectedTopic.complexity === 'Intermediate' || selectedTopic.difficulty_level === 'Intermediate')
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'bg-gradient-to-r from-primary to-primary/80 text-white'
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
          <Card className="mb-8 bg-gradient-to-br from-secondary/5 to-secondary/10 border-2 border-secondary/20 rounded-2xl shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-8 h-8 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
                <span className="text-secondary-700 dark:text-secondary-300 font-semibold text-lg">
                  Evaluating your critical opinion...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Results */}
        {evaluationResult && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Opinion Analysis Results
            </h3>
            <div className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-primary flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Overall Score
                    </h4>
                    <span className="text-3xl font-bold text-primary">
                      {evaluationResult.overall_score}/100
                    </span>
                  </div>
                  {evaluationResult.feedback && (
                    <p className="text-primary-700 dark:text-primary-300 text-base leading-relaxed">
                      {evaluationResult.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Strengths */}
              {evaluationResult.strengths && evaluationResult.strengths.length > 0 && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mt-1 shadow-lg">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-primary mb-3">Key Strengths</h4>
                        <div className="space-y-2">
                          {evaluationResult.strengths.map((strength, index) => (
                            <p key={index} className="text-primary-700 dark:text-primary-300 text-base leading-relaxed flex items-start">
                              <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                              {strength}
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
                <Card className="bg-gradient-to-br from-orange/5 to-orange/10 border-2 border-orange/20 rounded-2xl shadow-xl overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mt-1 shadow-lg">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-orange-600 mb-3">Areas for Improvement</h4>
                        <div className="space-y-2">
                          {evaluationResult.areas_for_improvement.map((area, index) => (
                            <p key={index} className="text-orange-700 dark:text-orange-300 text-base leading-relaxed flex items-start">
                              <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                              {area}
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

        {/* Action Buttons Section */}
        <div className="text-center space-y-8">
          {/* Primary Action Button */}
          <div className="flex justify-center">
          {isEvaluating ? (
            <Button
              disabled
                className="bg-gradient-to-r from-slate-400 to-slate-500 text-white px-16 py-5 rounded-2xl text-xl font-semibold shadow-xl cursor-not-allowed"
              size="lg"
            >
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mr-4">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              Evaluating...
            </Button>
          ) : !isRecording ? (
            <Button
              onClick={handleStartRecording}
                className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-16 py-5 rounded-2xl text-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              size="lg"
            >
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mr-4 group-hover:bg-white/30 transition-all duration-300">
                  <Mic className="h-5 w-5 text-white" />
                </div>
              Start Recording Your Opinion
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
                className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-16 py-5 rounded-2xl text-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-105"
              size="lg"
            >
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center mr-4 group-hover:bg-white/30 transition-all duration-300">
                  <Mic className="h-5 w-5 text-white" />
                </div>
              Stop Recording
            </Button>
          )}
          </div>

          {/* Secondary Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Button
                onClick={resetBuilder}
                variant="outline"
              className="group px-10 py-4 rounded-2xl border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-xl font-semibold text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 text-lg"
              >
              <Lightbulb className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
                Choose Different Topic
              </Button>
              <Button
                onClick={() => navigate('/dashboard/practice/stage-6')}
                variant="outline"
              className="group px-10 py-4 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-xl font-semibold text-secondary hover:bg-gradient-to-r hover:from-secondary/5 hover:to-secondary/10 text-lg"
              >
              <ArrowLeft className="h-5 w-5 mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
                Back to Stage 6
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 