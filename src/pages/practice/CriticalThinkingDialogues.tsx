import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Bot, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConversationMessage {
  id: string;
  sender: 'ai' | 'user';
  message: string;
  timestamp: Date;
}

export default function CriticalThinkingDialogues() {
  const navigate = useNavigate();
  const [currentTopic] = useState("Is privacy more important than national security?");
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const [conversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      sender: 'ai',
      message: 'Is privacy more important than national security?',
      timestamp: new Date()
    },
    {
      id: '2',
      sender: 'user',
      message: 'I believe privacy is paramount, but it must be balanced with security. Absolute privacy could shield threats, while unchecked surveillance erodes freedom.',
      timestamp: new Date()
    },
    {
      id: '3',
      sender: 'ai',
      message: 'But what if privacy endangers lives? Consider scenarios where surveillance could prevent terrorist attacks or major crimes.',
      timestamp: new Date()
    },
    {
      id: '4',
      sender: 'ai',
      message: 'Also, could you provide a specific example of a time you demonstrated innovation or problem-solving skills?',
      timestamp: new Date()
    }
  ]);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setShowFeedback(true);
  };

  const resetConversation = () => {
    setIsRecording(false);
    setShowFeedback(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
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
              Critical Thinking
            </h1>
          </div>
          
          <div className="w-10"></div>
        </div>

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
                        {message.sender === 'user' ? 'You' : 'AI Tutor'}
                      </span>
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
            <h3 className="text-lg font-semibold mb-4">Feedback</h3>
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Critical Analysis</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        Excellent balanced perspective on privacy vs security. Your argument structure was logical and well-reasoned.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-1">
                      <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Argumentation Skills</h4>
                      <p className="text-green-700 dark:text-green-300 text-sm">
                        You presented counterarguments effectively and acknowledged complexity in the issue.
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

          {showFeedback && (
            <div className="mt-4 space-y-3">
              <Button
                onClick={resetConversation}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full text-lg font-medium"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Continue Discussion
              </Button>
              <div>
                <Button
                  onClick={() => navigate('/dashboard/practice/stage-5')}
                  variant="outline"
                  className="px-6 py-2"
                >
                  Back to Stage 5
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Engage in thoughtful discussion with the AI tutor on complex topics
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 