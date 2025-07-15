import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, User, Lightbulb, Mic } from 'lucide-react';

const conversations = [
  {
    question: "How are you today?",
    correctAnswer: "I am fine.",
    suggestions: ["I am fine.", "I am good.", "I am okay.", "I am great."],
    hint: 'Great! Now try saying, "I\'m fine, thank you."'
  },
  {
    question: "What's your name?",
    correctAnswer: "My name is Ali.",
    suggestions: ["My name is Ali.", "I am Ali.", "Ali is my name.", "Call me Ali."],
    hint: 'Perfect! Now try saying, "Nice to meet you."'
  },
  {
    question: "Where are you from?",
    correctAnswer: "I am from Pakistan.",
    suggestions: ["I am from Pakistan.", "I come from Pakistan.", "Pakistan is my country.", "I live in Pakistan."],
    hint: 'Excellent! Now try saying, "How about you?"'
  },
  {
    question: "What do you do?",
    correctAnswer: "I am a student.",
    suggestions: ["I am a student.", "I study.", "I go to school.", "I am learning."],
    hint: 'Well done! Now try saying, "What about you?"'
  },
  {
    question: "How old are you?",
    correctAnswer: "I am 20 years old.",
    suggestions: ["I am 20 years old.", "I am twenty.", "My age is 20.", "I'm 20."],
    hint: 'Great! Now try saying, "And you?"'
  }
];

export const QuickResponse: React.FC = () => {
  const navigate = useNavigate();
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  const currentConversation = conversations[currentConversationIndex];

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setShowHint(true);
    
    // Auto-advance after showing hint
    setTimeout(() => {
      if (currentConversationIndex < conversations.length - 1) {
        setCurrentConversationIndex(currentConversationIndex + 1);
        setSelectedAnswer(null);
        setShowHint(false);
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative flex items-center justify-center mb-6 p-4 sm:p-6 lg:p-8">
        <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Quick Response</h1>
          <p className="text-muted-foreground">Answer questions quickly to build fluency</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Instruction */}
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-green-500" />
              <p className="text-sm font-medium">Respond to the AI's question.</p>
            </div>
          </CardContent>
        </Card>

        {/* AI Question */}
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>
          <Card className="flex-1 bg-muted">
            <CardContent className="p-4">
              <p className="text-lg font-medium">{currentConversation.question}</p>
            </CardContent>
          </Card>
        </div>

        {/* User Response */}
        {selectedAnswer && (
          <div className="flex items-start space-x-3 justify-end">
            <Card className="bg-green-500 text-white max-w-xs">
              <CardContent className="p-4">
                <p className="text-lg">{selectedAnswer}</p>
              </CardContent>
            </Card>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Hint */}
        {showHint && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-5 h-5 text-green-500 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  {currentConversation.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answer Options */}
        {!selectedAnswer && (
          <div className="space-y-3">
            {currentConversation.suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full h-auto p-4 text-left justify-start text-wrap"
                onClick={() => handleAnswerSelect(suggestion)}
              >
                <span className="text-lg">{suggestion}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Speak Button */}
      <div className="p-4 bg-card border-t">
        <Button className="w-full h-14 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl">
          <Mic className="w-5 h-5 mr-2" />
          Speak Now
        </Button>
      </div>
    </div>
  );
}; 