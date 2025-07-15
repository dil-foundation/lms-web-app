import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Mic, Volume2, X, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type LearnStep = 'welcome' | 'translate' | 'conversation';

export const AIStudentLearn: React.FC = () => {
  const [step, setStep] = useState<LearnStep>('welcome');

  const WelcomeScreen = () => (
    <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
      <div className="bg-primary/10 rounded-full p-4 mb-6">
        <Target className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold mb-2">Welcome to Your Learning Journey</h1>
      <p className="text-muted-foreground text-lg mb-8">Let's begin your English speaking adventure</p>
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 text-center">
          <p className="text-xl font-urdu mb-2">سیکھنے کے پلیٹ فارم میں خوش آمدید، آئیے انگریزی سیکھتے ہیں؟</p>
          <p className="text-muted-foreground">Welcome to the learning platform, shall we learn English?</p>
        </CardContent>
      </Card>
      <Button size="lg" className="mt-8 w-full max-w-md" onClick={() => setStep('translate')}>
        Continue to Learning
        <span className="ml-2">→</span>
      </Button>
    </div>
  );

  const TranslateScreen = () => (
    <div className="text-center max-w-2xl mx-auto flex flex-col items-center">
        <div className="bg-primary/10 rounded-full p-4 mb-6">
            <Mic className="w-16 h-16 text-primary" />
        </div>
      <h1 className="text-4xl font-bold mb-2">Speak to Translate</h1>
      <p className="text-muted-foreground text-lg mb-8">Transform your Urdu into English</p>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="lg"><Globe className="mr-2 h-5 w-5"/>Urdu</Button>
        <Button size="lg">English</Button>
      </div>
      <Card className="w-full max-w-md shadow-lg mb-8">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Press the button and speak in urdu to get started</p>
        </CardContent>
      </Card>
        <Button size="lg" className="w-full max-w-md" onClick={() => setStep('conversation')}>
        Start Real-time Conversation
        <span className="ml-2">→</span>
        </Button>
        <div className="flex gap-4 mt-8">
            <Card className="p-4 flex-1 text-center shadow-lg">Perfect for daily conversations</Card>
            <Card className="p-4 flex-1 text-center shadow-lg">Learn at your own pace</Card>
      </div>
    </div>
  );

  const ConversationScreen = () => (
    <div className="text-center max-w-2xl mx-auto flex flex-col items-center h-full">
      <Card className="w-full max-w-3xl shadow-lg mb-8 flex items-center p-4">
        <div className="bg-primary/10 rounded-full p-3 mr-4">
          <Mic className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-grow text-left">
          <h2 className="font-semibold text-lg">AI Tutor Conversation</h2>
          <p className="text-muted-foreground">Real-time learning experience</p>
        </div>
        <Badge variant="secondary" className="bg-green-500 h-3 w-3 p-0"></Badge>
      </Card>
      <Card className="w-full max-w-md shadow-lg mb-12">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Welcome to your AI tutor conversation!</p>
        </CardContent>
      </Card>
      <div className="relative mb-12">
        {/* Placeholder for audio waveform */}
        <div className="w-64 h-64 border-4 border-dashed rounded-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Audio Visualizer</p>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={() => setStep('translate')}>
            <X className="w-8 h-8" />
        </Button>
        <Button size="icon" className="w-24 h-24 rounded-full bg-green-500 hover:bg-green-600">
            <Volume2 className="w-12 h-12" />
        </Button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'translate':
        return <TranslateScreen />;
      case 'conversation':
        return <ConversationScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <Card className="h-full w-full max-w-4xl mx-auto">
      <CardContent className="p-8 h-full flex items-center justify-center">
        {renderStep()}
      </CardContent>
    </Card>
  );
}; 