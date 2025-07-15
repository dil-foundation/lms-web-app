import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Play, Mic } from 'lucide-react';

const phrases = [
  "Hello, how are you?",
  "My name is John.",
  "Nice to meet you.",
  "How was your day?",
  "I'm doing well, thank you.",
  "What's your favorite color?",
  "I like to read books.",
  "The weather is nice today.",
  "Can you help me please?",
  "Thank you very much.",
  "See you tomorrow.",
  "Have a great day!",
  "I'm sorry, I don't understand.",
  "Could you repeat that?",
  "Where are you from?",
  "I'm from Pakistan.",
  "What time is it?",
  "It's three o'clock.",
  "I'm hungry.",
  "Let's go eat something.",
  "How much does this cost?",
  "It's very expensive.",
  "I need to go now.",
  "Take care!",
  "Good morning!"
];

export const RepeatAfterMe: React.FC = () => {
  const navigate = useNavigate();
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  const currentPhrase = phrases[currentPhraseIndex];

  const handlePlayAudio = () => {
    // Audio playback functionality would be implemented here
    console.log('Playing audio for:', currentPhrase);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // Recording functionality would be implemented here
    setTimeout(() => {
      setIsRecording(false);
      // Auto-advance to next phrase after recording
      if (currentPhraseIndex < phrases.length - 1) {
        setCurrentPhraseIndex(currentPhraseIndex + 1);
      }
    }, 5000);
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
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Repeat After Me</h1>
          <p className="text-muted-foreground">Practice speaking with perfect pronunciation</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Phrase Card */}
        <Card className="w-full max-w-md mb-8 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">
                {currentPhrase}
              </h2>
              
              <Button
                onClick={handlePlayAudio}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
                size="icon"
              >
                <Play className="w-8 h-8" />
              </Button>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Listen to the phrase and repeat it clearly
            </p>
          </CardContent>
        </Card>

        {/* Recording Button */}
        <Button
          onClick={handleStartRecording}
          disabled={isRecording}
          className={`w-full max-w-md h-16 text-xl font-semibold rounded-xl transition-all duration-300 ${
            isRecording 
              ? 'bg-gray-500 hover:bg-gray-600' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          <Mic className="w-6 h-6 mr-3" />
          {isRecording ? 'Recording... (5s max)' : 'Speak Now (5s max)'}
        </Button>
      </div>
    </div>
  );
}; 