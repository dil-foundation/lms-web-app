import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyRoutine() {
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([
    {
      type: 'ai',
      message: 'Tell me about your daily routine. What do you do in the morning?'
    }
  ]);

  const mockUserResponses = [
    "I wake up at 7 AM and brush my teeth. Then I have breakfast with my family.",
    "In the morning, I get ready for work. I take shower and wear my clothes.",
    "I usually wake up early. First thing I do is pray and then I make tea.",
    "My morning starts at 6:30. I do exercise for 30 minutes and then get ready.",
    "I wake up, wash my face, and have breakfast. Then I go to office."
  ];

  const mockAIResponses = [
    "That sounds like a good routine! What time do you usually have breakfast? Can you tell me more about what you eat?",
    "Great! Taking a shower and getting dressed are important parts of the morning routine. What do you do after getting ready?",
    "Prayer and tea - that's a peaceful way to start the day. What kind of tea do you prefer?",
    "Exercise in the morning is excellent for health! What type of exercise do you do?",
    "A simple and effective routine. How long does it take you to get to your office?"
  ];

  const handleSubmit = () => {
    if (userInput.trim()) {
      // Add user message
      const newConversation = [
        ...conversation,
        { type: 'user', message: userInput }
      ];
      
      // Add AI response
      const randomResponse = mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)];
      newConversation.push({ type: 'ai', message: randomResponse });
      
      setConversation(newConversation);
      setUserInput('');
    }
  };

  const handleMockResponse = () => {
    const randomResponse = mockUserResponses[Math.floor(Math.random() * mockUserResponses.length)];
    setUserInput(randomResponse);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-2')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold">Daily Routine</h1>
            <p className="text-muted-foreground">Practice describing your daily activities</p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-sm text-green-700 dark:text-green-300">
              💡 <strong>Tip:</strong> Describe your daily routine in detail. Use time expressions like "first", "then", "after that", "finally". The AI will ask follow-up questions to help you practice.
            </p>
          </CardContent>
        </Card>

        {/* Conversation Area */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.type === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-foreground'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Input Area */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Type your response here..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="min-h-20"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!userInput.trim()}
                >
                  Send Response
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleMockResponse}
                  className="px-4"
                >
                  Try Example
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 