import React, { createContext, useContext, ReactNode } from 'react';
import { useAITutorSettings, UseAITutorSettingsReturn } from '@/hooks/useAITutorSettings';

interface AITutorSettingsContextType extends UseAITutorSettingsReturn {}

const AITutorSettingsContext = createContext<AITutorSettingsContextType | undefined>(undefined);

interface AITutorSettingsProviderProps {
  children: ReactNode;
}

export const AITutorSettingsProvider: React.FC<AITutorSettingsProviderProps> = ({ children }) => {
  const aiTutorSettings = useAITutorSettings();

  return (
    <AITutorSettingsContext.Provider value={aiTutorSettings}>
      {children}
    </AITutorSettingsContext.Provider>
  );
};

export const useAITutorSettingsContext = (): AITutorSettingsContextType => {
  const context = useContext(AITutorSettingsContext);
  if (context === undefined) {
    throw new Error('useAITutorSettingsContext must be used within an AITutorSettingsProvider');
  }
  return context;
};

// Hook to get runtime settings for AI behavior
export const useAITutorRuntimeSettings = () => {
  const { settings } = useAITutorSettingsContext();
  
  return {
    personalityType: settings.personalityType,
    responseStyle: settings.responseStyle,
    adaptiveDifficulty: settings.adaptiveDifficulty,
    contextAwareness: settings.contextAwareness,
    maxResponseLength: settings.maxResponseLength,
    errorCorrectionStyle: settings.errorCorrectionStyle,
    culturalSensitivity: settings.culturalSensitivity,
    ageAppropriate: settings.ageAppropriate,
    professionalContext: settings.professionalContext,
    customPrompts: settings.customPrompts,
    emotionalIntelligence: settings.emotionalIntelligence,
    realTimeAdaptation: settings.realTimeAdaptation,
    voiceEnabled: settings.voiceEnabled,
    voiceGender: settings.voiceGender,
    speechRate: settings.speechRate,
    audioFeedback: settings.audioFeedback,
  };
};
