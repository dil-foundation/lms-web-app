import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AILMSMode = 'ai' | 'lms';

interface AILMSContextType {
  mode: AILMSMode;
  setMode: (mode: AILMSMode) => void;
  isAIMode: boolean;
  isLMSMode: boolean;
  toggleMode: () => void;
}

const AILMSContext = createContext<AILMSContextType | undefined>(undefined);

interface AILMSProviderProps {
  children: ReactNode;
}

export const AILMSProvider: React.FC<AILMSProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<AILMSMode>(() => {
    // Load from localStorage if available, default to 'lms'
    const savedMode = localStorage.getItem('ailms-mode');
    return (savedMode as AILMSMode) || 'lms';
  });

  // Save to localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem('ailms-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode(prev => prev === 'ai' ? 'lms' : 'ai');
  };

  const value: AILMSContextType = {
    mode,
    setMode,
    isAIMode: mode === 'ai',
    isLMSMode: mode === 'lms',
    toggleMode
  };

  return (
    <AILMSContext.Provider value={value}>
      {children}
    </AILMSContext.Provider>
  );
};

export const useAILMS = (): AILMSContextType => {
  const context = useContext(AILMSContext);
  if (context === undefined) {
    throw new Error('useAILMS must be used within an AILMSProvider');
  }
  return context;
}; 