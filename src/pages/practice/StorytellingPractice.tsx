import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Mic, Lightbulb, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StorytellingPractice() {
  const navigate = useNavigate();
  const [userStory, setUserStory] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState(0);

  const storyPrompts = [
    {
      title: 'Share a Special Day',
      prompt: 'Tell me about a memorable day you had recently. What made it special?',
      hints: ['Use past tense verbs', 'Include details about what you did', 'Describe your feelings']
    },
    {
      title: 'Describe Your Weekend',
      prompt: 'How did you spend your last weekend? What activities did you enjoy?',
      hints: ['Use sequence words like "first", "then", "after that"', 'Mention specific activities', 'Talk about who you were with']
    },
    {
      title: 'A Favorite Memory',
      prompt: 'Share a favorite childhood memory. Why is it special to you?',
      hints: ['Use descriptive language', 'Explain why it was meaningful', 'Include sensory details']
    },
    {
      title: 'Future Plans',
      prompt: 'What are your plans for the upcoming holidays or vacation?',
      hints: ['Use future tense', 'Be specific about activities', 'Mention who you plan to spend time with']
    }
  ];

  const currentStoryPrompt = storyPrompts[currentPrompt];

  // Timer effect for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      generateFeedback();
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      setFeedback(null);
    }
  };

  const generateFeedback = () => {
    const feedbackOptions = [
      "Great storytelling! Try adding sequence words like 'First, then, after that'.",
      "Nice work! Your story has good details. Consider adding more emotions.",
      "Well done! Try to speak a bit slower for better clarity.",
      "Excellent! You used past tense correctly. Keep practicing descriptive words.",
      "Good effort! Try to include more specific details about time and place."
    ];
    
    const randomFeedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
    setFeedback(randomFeedback);
  };

  const handleNextPrompt = () => {
    if (currentPrompt < storyPrompts.length - 1) {
      setCurrentPrompt(currentPrompt + 1);
      setUserStory('');
      setFeedback(null);
      setRecordingTime(0);
      setIsRecording(false);
    }
  };

  const handlePreviousPrompt = () => {
    if (currentPrompt > 0) {
      setCurrentPrompt(currentPrompt - 1);
      setUserStory('');
      setFeedback(null);
      setRecordingTime(0);
      setIsRecording(false);
    }
  };

  const mockStoryText = "I went to the beach with my family. We played in the sand and swam in the ocean. It was a lot of fun.";

  const handleMockStory = () => {
    setUserStory(mockStoryText);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-3')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Storytelling</h1>
            <p className="text-muted-foreground">Practice describing experiences</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Prompt {currentPrompt + 1} of {storyPrompts.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPrompt}
                disabled={currentPrompt === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPrompt}
                disabled={currentPrompt === storyPrompts.length - 1}
              >
                Next
              </Button>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentPrompt + 1) / storyPrompts.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Story Prompt */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-3">
              {currentStoryPrompt.title}
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-4">
              {currentStoryPrompt.prompt}
            </p>
            
            {/* Hints */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Tips:</span>
              </div>
              <ul className="space-y-1">
                {currentStoryPrompt.hints.map((hint, index) => (
                  <li key={index} className="text-sm text-blue-700 dark:text-blue-300">
                    • {hint}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Speaking Timer */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Speaking Time</div>
              <div className="text-4xl font-mono text-green-600 dark:text-green-400 mb-4">
                {formatTime(recordingTime)}<span className="text-lg text-muted-foreground">/30s</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((recordingTime / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story Input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <textarea
              placeholder="Start typing your story or use the speak button..."
              value={userStory}
              onChange={(e) => setUserStory(e.target.value)}
              className="w-full min-h-32 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700"
            />
            
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleMockStory}
                className="px-4"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Idea?
              </Button>
              
              <Button
                onClick={toggleRecording}
                className={`flex-1 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isRecording ? 'Stop Recording' : 'Speak Now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        {feedback && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-blue-600 dark:text-blue-400 text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Feedback</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{feedback}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 