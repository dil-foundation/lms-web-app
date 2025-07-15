import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, User, Volume2, Lightbulb, Mic, Ear } from 'lucide-react';

const conversations = [
  {
    audioText: "Hi! My name is Sarah. What is your name?",
    suggestedResponse: "My name is Amina.",
    hint: "Try saying: My name is Amina.",
    speaker: "Sarah"
  },
  {
    audioText: "Nice to meet you, Amina! How are you doing today?",
    suggestedResponse: "I'm doing well, thank you.",
    hint: "Try saying: I'm doing well, thank you.",
    speaker: "Sarah"
  },
  {
    audioText: "That's great to hear! Where are you from?",
    suggestedResponse: "I'm from Pakistan.",
    hint: "Try saying: I'm from Pakistan.",
    speaker: "Sarah"
  },
  {
    audioText: "Wonderful! What do you like to do in your free time?",
    suggestedResponse: "I like to read books and watch movies.",
    hint: "Try saying: I like to read books and watch movies.",
    speaker: "Sarah"
  },
  {
    audioText: "That sounds interesting! What's your favorite book?",
    suggestedResponse: "I really enjoy mystery novels.",
    hint: "Try saying: I really enjoy mystery novels.",
    speaker: "Sarah"
  }
];

export const ListenAndReply: React.FC = () => {
  const navigate = useNavigate();
  const [currentConversationIndex, setCurrentConversationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  
  const currentConversation = conversations[currentConversationIndex];

  const handlePlayAudio = () => {
    setIsPlaying(true);
    setHasListened(true);
    // Audio playback simulation
    setTimeout(() => {
      setIsPlaying(false);
      setShowHint(true);
    }, 3000);
  };

  const handleSpeak = () => {
    // Voice recording simulation
    setTimeout(() => {
      if (currentConversationIndex < conversations.length - 1) {
        setCurrentConversationIndex(currentConversationIndex + 1);
        setShowHint(false);
        setHasListened(false);
      }
    }, 2000);
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
            <Ear className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Listen and Reply</h1>
          <p className="text-muted-foreground">Improve listening skills with audio prompts</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Audio Prompt Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            {/* Speaker Avatar */}
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            
            {/* Audio Text */}
            <h2 className="text-xl font-semibold mb-4 text-center">
              {currentConversation.audioText}
            </h2>
            
            {/* Play Button */}
            <Button
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className={`w-16 h-16 rounded-full shadow-lg transition-all duration-300 ${
                isPlaying 
                  ? 'bg-gray-500 hover:bg-gray-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
              size="icon"
            >
              <Volume2 className="w-8 h-8" />
            </Button>
            
            {isPlaying && (
              <p className="text-sm text-muted-foreground mt-2">Playing audio...</p>
            )}
          </CardContent>
        </Card>

        {/* Hint Card */}
        {showHint && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    Try saying:
                  </p>
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    {currentConversation.suggestedResponse}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!hasListened && (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-green-700 dark:text-green-300">
                Listen to the audio and respond naturally
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Speak Button */}
      <div className="p-4 sm:p-6 lg:p-8">
        <Button 
          onClick={handleSpeak}
          className="w-full h-14 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-300"
        >
          <Mic className="w-5 h-5 mr-2" />
          Speak Now
        </Button>
      </div>
    </div>
  );
}; 