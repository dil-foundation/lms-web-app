/**
 * Example of how to integrate AI Tutor Settings into practice components
 * This file demonstrates the integration patterns - you can apply these to your existing practice components
 */

import React, { useEffect, useState } from 'react';
import { useAITutorRuntimeSettings } from '@/contexts/AITutorSettingsContext';
import { generateAITutorPrompt, applyVoiceSettings, shouldApplyGamification } from '@/utils/aiTutorUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, Star, Trophy } from 'lucide-react';

interface AITutorIntegrationExampleProps {
  lessonType: string;
  userLevel: string;
}

export const AITutorIntegrationExample: React.FC<AITutorIntegrationExampleProps> = ({
  lessonType,
  userLevel
}) => {
  // Get AI Tutor settings from context
  const aiSettings = useAITutorRuntimeSettings();
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [points, setPoints] = useState(0);

  // Generate AI prompt configuration based on settings
  const promptConfig = generateAITutorPrompt(aiSettings, {
    lessonType,
    userLevel,
    userAge: 25, // This would come from user profile
    culturalBackground: 'international' // This would come from user profile
  });

  // Example function to call AI service with configured settings
  const callAITutor = async (userInput: string) => {
    setIsLoading(true);
    try {
      // This is where you'd call your AI service (OpenAI, etc.)
      // Using the promptConfig.systemPrompt and other settings
      
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: promptConfig.systemPrompt,
          userInput,
          maxTokens: promptConfig.maxTokens,
          temperature: promptConfig.temperature,
          personalityType: aiSettings.personalityType,
          responseStyle: aiSettings.responseStyle,
        })
      });
      
      const data = await response.json();
      setAiResponse(data.response);
      
      // Apply voice settings if enabled
      if (aiSettings.voiceEnabled) {
        const utterance = applyVoiceSettings(aiSettings);
        if (utterance) {
          utterance.text = data.response;
          window.speechSynthesis.speak(utterance);
        }
      }
      
      // Apply gamification if enabled
      if (shouldApplyGamification(aiSettings)) {
        setPoints(prev => prev + 10);
      }
      
    } catch (error) {
      console.error('AI Tutor error:', error);
      setAiResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user attempts and provide help based on repetition threshold
  const handleUserAttempt = (userInput: string, isCorrect: boolean) => {
    setAttempts(prev => prev + 1);
    
    if (!isCorrect && attempts >= (aiSettings.repetitionThreshold || 3)) {
      // Provide additional help after threshold is reached
      callAITutor(`The user has attempted ${attempts} times. Please provide additional help and guidance for: ${userInput}`);
    } else if (isCorrect) {
      // Celebrate success
      const celebrationMessage = aiSettings.personalityType === 'encouraging' 
        ? "Great job! You got it right!" 
        : "Correct. Well done.";
      setAiResponse(celebrationMessage);
      setAttempts(0); // Reset attempts
    }
  };

  // Example of adaptive difficulty
  useEffect(() => {
    if (aiSettings.adaptiveDifficulty && points > 50) {
      // Increase difficulty based on performance
      console.log('Increasing difficulty based on user performance');
    }
  }, [points, aiSettings.adaptiveDifficulty]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Tutor Integration Example
            {shouldApplyGamification(aiSettings) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {points} points
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display current AI settings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">Personality</p>
              <p className="text-xs text-muted-foreground capitalize">{aiSettings.personalityType}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Style</p>
              <p className="text-xs text-muted-foreground capitalize">{aiSettings.responseStyle}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Max Length</p>
              <p className="text-xs text-muted-foreground">{aiSettings.maxResponseLength} words</p>
            </div>
            <div>
              <p className="text-sm font-medium">Voice</p>
              <p className="text-xs text-muted-foreground">
                {aiSettings.voiceEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          {/* AI Response Display */}
          {aiResponse && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    🤖
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{aiResponse}</p>
                    {aiSettings.voiceEnabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const utterance = applyVoiceSettings(aiSettings);
                          if (utterance) {
                            utterance.text = aiResponse;
                            window.speechSynthesis.speak(utterance);
                          }
                        }}
                      >
                        <Volume2 className="w-4 h-4 mr-1" />
                        Replay
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Example interaction buttons */}
          <div className="space-y-2">
            <Button
              onClick={() => callAITutor("Hello, I'd like to practice English conversation.")}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'AI is thinking...' : 'Start Conversation'}
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => handleUserAttempt("I am good", true)}
              >
                Correct Answer
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUserAttempt("I am good", false)}
              >
                Wrong Answer
              </Button>
            </div>
          </div>

          {/* Display attempts if repetition threshold is being tracked */}
          {attempts > 0 && (
            <div className="text-sm text-muted-foreground">
              Attempts: {attempts} / {aiSettings.repetitionThreshold || 3}
              {attempts >= (aiSettings.repetitionThreshold || 3) && (
                <span className="text-orange-600 ml-2">Help will be provided</span>
              )}
            </div>
          )}

          {/* Show system prompt for debugging (remove in production) */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              View System Prompt (Debug)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {promptConfig.systemPrompt}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * HOW TO INTEGRATE INTO EXISTING PRACTICE COMPONENTS:
 * 
 * 1. Wrap your app with AITutorSettingsProvider in App.tsx:
 *    <AITutorSettingsProvider>
 *      <YourApp />
 *    </AITutorSettingsProvider>
 * 
 * 2. In your practice components, use the hook:
 *    const aiSettings = useAITutorRuntimeSettings();
 * 
 * 3. Generate prompts with settings:
 *    const promptConfig = generateAITutorPrompt(aiSettings, context);
 * 
 * 4. Apply voice settings:
 *    if (aiSettings.voiceEnabled) {
 *      const utterance = applyVoiceSettings(aiSettings);
 *      utterance.text = response;
 *      speechSynthesis.speak(utterance);
 *    }
 * 
 * 5. Check for gamification:
 *    if (shouldApplyGamification(aiSettings)) {
 *      // Add points, badges, etc.
 *    }
 * 
 * 6. Handle repetition threshold:
 *    if (attempts >= getRepetitionThreshold(aiSettings)) {
 *      // Provide additional help
 *    }
 */
