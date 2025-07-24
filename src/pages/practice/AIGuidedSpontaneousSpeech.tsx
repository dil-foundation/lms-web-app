import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Mic, Bot, User, Rocket, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConversationTopic {
  id: string;
  title: string;
  description: string;
  complexity: 'Advanced' | 'Expert';
}

interface ConversationMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  timestamp: Date;
  responseTime?: number;
}

export default function AIGuidedSpontaneousSpeech() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<ConversationTopic>({
    id: 'cultural-nuances',
    title: 'Cultural Nuances in Global Communication',
    description: 'Discuss the subtle differences in communication styles across cultures',
    complexity: 'Expert'
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const topics: ConversationTopic[] = [
    {
      id: 'cultural-nuances',
      title: 'Cultural Nuances in Global Communication',
      description: 'Discuss the subtle differences in communication styles across cultures',
      complexity: 'Expert'
    },
    {
      id: 'ethical-dilemmas',
      title: 'Modern Ethical Dilemmas',
      description: 'Explore complex moral questions in contemporary society',
      complexity: 'Expert'
    },
    {
      id: 'innovation-impact',
      title: 'Innovation and Social Impact',
      description: 'Analyze how technological advances shape human behavior',
      complexity: 'Advanced'
    }
  ];

  const [conversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      sender: 'ai',
      message: 'Let\'s explore cultural nuances in communication. How do you think directness in communication is perceived differently across cultures?',
      timestamp: new Date(),
    },
    {
      id: '2',
      sender: 'user',
      message: 'That\'s fascinating. In my experience, directness can be seen as efficiency in some cultures, while others might perceive it as rudeness. For instance, German business culture often values straightforward communication, whereas in many Asian cultures, indirect communication preserves harmony and shows respect.',
      timestamp: new Date(),
      responseTime: 3.2
    },
    {
      id: '3',
      sender: 'ai',
      message: 'Excellent observation! You\'ve touched on a crucial point about cultural context. Can you elaborate on how this affects international business negotiations?',
      timestamp: new Date(),
    }
  ]);

  const handleStartSession = () => {
    setSessionStarted(true);
    setShowFeedback(true);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleTopicChange = (topic: ConversationTopic) => {
    setCurrentTopic(topic);
    setSessionStarted(false);
    setShowFeedback(false);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setIsRecording(false);
    setShowFeedback(false);
  };

  if (!sessionStarted) {
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
                Spontaneous Speech
              </h1>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Discussion Topic</h2>
              <p className="text-muted-foreground">Select a topic for real-time conversation practice</p>
            </div>

            <div className="space-y-4">
              {topics.map((topic) => (
                <Card 
                  key={topic.id}
                  className={`cursor-pointer transition-all ${
                    currentTopic.id === topic.id 
                      ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleTopicChange(topic)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{topic.title}</h3>
                          <p className="text-muted-foreground text-sm mb-2">{topic.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          topic.complexity === 'Expert' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {topic.complexity}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={handleStartSession}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Start Conversation
              </Button>
            </div>

            {/* Session Guidelines */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Session Guidelines</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Respond naturally and spontaneously - don't overthink your answers
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Focus on fluency and natural flow rather than perfect grammar
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <p className="text-muted-foreground text-sm">
                      Express your genuine thoughts and opinions on the topic
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
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
              Spontaneous Speech
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Current Topic */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">{currentTopic.title}</h3>
                <p className="text-sm text-green-700 dark:text-green-300">{currentTopic.description}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                currentTopic.complexity === 'Expert' 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {currentTopic.complexity}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Conversation */}
        <div className="space-y-4 mb-6">
          {conversation.map((message) => (
            <Card 
              key={message.id} 
              className={message.sender === 'user' ? 'bg-green-600 dark:bg-green-700' : 'border-dashed border-2 border-muted-foreground/20'}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-white/20' 
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium ${
                        message.sender === 'user' 
                          ? 'text-white' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {message.sender === 'user' ? 'You' : 'AI Guide'}
                      </span>
                      {message.responseTime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-white/70" />
                          <span className="text-xs text-white/70">{message.responseTime}s</span>
                        </div>
                      )}
                    </div>
                    <p className={message.sender === 'user' ? 'text-white' : 'text-foreground'}>
                      {message.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feedback Section */}
        {showFeedback && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Real-Time Feedback</h3>
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Natural Flow</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Excellent natural conversation flow! Your responses feel spontaneous and authentic.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Response Time</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Great response time (3.2s average). You're thinking quickly and expressing ideas fluently.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Rocket className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Complexity Handling</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        You're handling complex topics with sophistication and providing nuanced perspectives.
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
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
              size="lg"
            >
              <Mic className="h-5 w-5 mr-2" />
              Speak Now
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
                onClick={resetSession}
                variant="outline"
                className="px-6 py-2"
              >
                New Topic
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