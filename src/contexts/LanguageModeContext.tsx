import React, { createContext, useContext, useState, useEffect } from 'react';
import { LANGUAGE_CONFIGS } from '../utils/chatgptTimingConfig.js';

// Create the context
const LanguageModeContext = createContext(undefined);

// Language mode types
export const LANGUAGE_MODES = {
  ENGLISH: 'english',
  URDU: 'urdu'
};

// Default language mode
const DEFAULT_LANGUAGE_MODE = LANGUAGE_MODES.URDU;

// Language mode provider component
export const LanguageModeProvider = ({ children }) => {
  const [languageMode, setLanguageMode] = useState(DEFAULT_LANGUAGE_MODE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load language mode from localStorage on mount
  useEffect(() => {
    try {
      const savedLanguageMode = localStorage.getItem('languageMode');
      if (savedLanguageMode && Object.values(LANGUAGE_MODES).includes(savedLanguageMode)) {
        setLanguageMode(savedLanguageMode);
      }
    } catch (error) {
      console.error('Error loading language mode from localStorage:', error);
    }
  }, []);

  // Save language mode to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('languageMode', languageMode);
    } catch (error) {
      console.error('Error saving language mode to localStorage:', error);
    }
  }, [languageMode]);

  // Change language mode
  const changeLanguageMode = async (newMode) => {
    if (!Object.values(LANGUAGE_MODES).includes(newMode)) {
      throw new Error(`Invalid language mode: ${newMode}`);
    }

    if (newMode === languageMode) {
      return; // No change needed
    }

    setIsLoading(true);
    setError(null);

    try {
      // You can add any async operations here if needed
      // For example, loading language-specific resources

      setLanguageMode(newMode);
      console.log(`Language mode changed to: ${newMode}`);
    } catch (error) {
      console.error('Error changing language mode:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle between English and Urdu
  const toggleLanguageMode = () => {
    const newMode = languageMode === LANGUAGE_MODES.ENGLISH 
      ? LANGUAGE_MODES.URDU 
      : LANGUAGE_MODES.ENGLISH;
    return changeLanguageMode(newMode);
  };

  // Get current language configuration
  const getLanguageConfig = () => {
    return LANGUAGE_CONFIGS[languageMode] || LANGUAGE_CONFIGS[DEFAULT_LANGUAGE_MODE];
  };

  // Get display name for language mode
  const getLanguageDisplayName = (mode = languageMode) => {
    switch (mode) {
      case LANGUAGE_MODES.ENGLISH:
        return 'English';
      case LANGUAGE_MODES.URDU:
        return 'اردو';
      default:
        return 'Unknown';
    }
  };

  // Get language direction (for RTL support)
  const getLanguageDirection = (mode = languageMode) => {
    switch (mode) {
      case LANGUAGE_MODES.ENGLISH:
        return 'ltr';
      case LANGUAGE_MODES.URDU:
        return 'rtl';
      default:
        return 'ltr';
    }
  };

  // Check if current language is RTL
  const isRTL = (mode = languageMode) => {
    return getLanguageDirection(mode) === 'rtl';
  };

  // Get language-specific formatting
  const getLanguageFormatting = (mode = languageMode) => {
    const config = LANGUAGE_CONFIGS[mode] || LANGUAGE_CONFIGS[DEFAULT_LANGUAGE_MODE];
    return {
      speechLang: config.SPEECH_LANG,
      speechRate: config.SPEECH_RATE,
      speechPitch: config.SPEECH_PITCH,
      vadThreshold: config.VAD_THRESHOLD,
      direction: getLanguageDirection(mode),
      isRTL: isRTL(mode)
    };
  };

  // Reset to default language
  const resetLanguageMode = () => {
    return changeLanguageMode(DEFAULT_LANGUAGE_MODE);
  };

  // Get all available languages
  const getAvailableLanguages = () => {
    return Object.values(LANGUAGE_MODES).map(mode => ({
      value: mode,
      label: getLanguageDisplayName(mode),
      direction: getLanguageDirection(mode),
      isRTL: isRTL(mode)
    }));
  };

  const contextValue = {
    // Current state
    languageMode,
    isLoading,
    error,
    
    // Language mode actions
    changeLanguageMode,
    toggleLanguageMode,
    resetLanguageMode,
    
    // Language information
    getLanguageConfig,
    getLanguageDisplayName,
    getLanguageDirection,
    getLanguageFormatting,
    isRTL,
    getAvailableLanguages,
    
    // Language constants
    LANGUAGE_MODES,
    DEFAULT_LANGUAGE_MODE,
    
    // Computed properties
    currentLanguageConfig: getLanguageConfig(),
    currentLanguageDisplay: getLanguageDisplayName(),
    currentLanguageDirection: getLanguageDirection(),
    currentLanguageFormatting: getLanguageFormatting(),
    currentIsRTL: isRTL(),
    availableLanguages: getAvailableLanguages()
  };

  return (
    <LanguageModeContext.Provider value={contextValue}>
      {children}
    </LanguageModeContext.Provider>
  );
};

// Hook to use language mode context
export const useLanguageMode = () => {
  const context = useContext(LanguageModeContext);
  
  if (!context) {
    throw new Error('useLanguageMode must be used within a LanguageModeProvider');
  }
  
  return context;
};

// HOC to wrap components with language mode
export const withLanguageMode = (Component) => {
  return function LanguageModeComponent(props) {
    return (
      <LanguageModeProvider>
        <Component {...props} />
      </LanguageModeProvider>
    );
  };
};

// Language mode selector component
export const LanguageModeSelector = ({ 
  className = '', 
  onChange,
  disabled = false,
  showLabels = true,
  style = 'segmented' // 'segmented', 'dropdown', 'buttons'
}) => {
  const { 
    languageMode, 
    changeLanguageMode, 
    availableLanguages, 
    isLoading 
  } = useLanguageMode();

  const handleChange = async (newMode) => {
    try {
      await changeLanguageMode(newMode);
      if (onChange) {
        onChange(newMode);
      }
    } catch (error) {
      console.error('Error changing language mode:', error);
    }
  };

  if (style === 'segmented') {
    return (
      <div className={`inline-flex rounded-lg border border-gray-300 ${className}`}>
        {availableLanguages.map((lang) => (
          <button
            key={lang.value}
            onClick={() => handleChange(lang.value)}
            disabled={disabled || isLoading}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${languageMode === lang.value
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
              }
              ${lang.value === LANGUAGE_MODES.ENGLISH 
                ? 'rounded-l-lg' 
                : 'rounded-r-lg border-l'
              }
              ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {showLabels ? lang.label : lang.value.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (style === 'dropdown') {
    return (
      <select
        value={languageMode}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled || isLoading}
        className={`
          px-3 py-2 border border-gray-300 rounded-md text-sm
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        {availableLanguages.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {showLabels ? lang.label : lang.value.toUpperCase()}
          </option>
        ))}
      </select>
    );
  }

  if (style === 'buttons') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {availableLanguages.map((lang) => (
          <button
            key={lang.value}
            onClick={() => handleChange(lang.value)}
            disabled={disabled || isLoading}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${languageMode === lang.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
              ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {showLabels ? lang.label : lang.value.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return null;
};

// Language mode indicator component
export const LanguageModeIndicator = ({ className = '' }) => {
  const { currentLanguageDisplay, currentIsRTL } = useLanguageMode();

  return (
    <div 
      className={`
        inline-flex items-center gap-1 px-2 py-1 
        bg-blue-100 text-blue-800 rounded-md text-xs font-medium
        ${className}
      `}
      dir={currentIsRTL ? 'rtl' : 'ltr'}
    >
      <span>{currentLanguageDisplay}</span>
    </div>
  );
};

export default LanguageModeContext; 