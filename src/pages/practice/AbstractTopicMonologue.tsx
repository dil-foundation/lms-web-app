import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, BookOpen, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AbstractTopicMonologue() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [hasStarted, setHasStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const topics = [
    "The importance of education",
    "The impact of technology on society",
    "Environmental conservation and sustainability",
    "The role of art in human culture",
    "The future of work and automation",
    "Social media and its effects on relationships"
  ];

  const [currentTopic] = useState(topics[0]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRecording(false);
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setHasStarted(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsCompleted(true);
  };

  const resetSession = () => {
    setIsRecording(false);
    setTimeLeft(120);
    setHasStarted(false);
    setIsCompleted(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-4')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <h1 className="text-xl font-semibold text-green-600 dark:text-green-400">
              Abstract Topic
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Speak Your Mind</h2>
          </div>

          {/* Topic Card */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="text-center">
                <span className="text-green-600 dark:text-green-400 font-medium">Topic: </span>
                <span className="text-foreground">{currentTopic}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timer */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {formatTime(timeLeft).split(':')[0]}
                </div>
                <div className="text-sm text-gray-400">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">
                  {formatTime(timeLeft).split(':')[1]}
                </div>
                <div className="text-sm text-gray-400">Seconds</div>
              </div>
            </div>
          </div>

          {/* Transcription Area */}
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-6">
              <div className="min-h-[120px] flex items-center justify-center">
                <p className="text-muted-foreground italic text-center">
                  Live transcription will appear here...
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          {(hasStarted || isCompleted) && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Feedback</h3>
              <div className="space-y-4">
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Vocabulary Richness</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          Your word choice was diverse and appropriate for the topic.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                        <GitBranch className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Sentence Structure</h4>
                        <p className="text-green-700 dark:text-green-300 text-sm">
                          You used a variety of sentence lengths and structures effectively.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="text-center">
            {!hasStarted ? (
              <Button
                onClick={handleStartRecording}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Speak Now
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
              <div className="space-y-3">
                <Button
                  onClick={resetSession}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                  size="lg"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Try Again
                </Button>
                <div>
                  <Button
                    onClick={() => navigate('/dashboard/practice/stage-4')}
                    variant="outline"
                    className="px-6 py-2"
                  >
                    Back to Stage 4
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 