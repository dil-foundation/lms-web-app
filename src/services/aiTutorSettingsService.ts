import { supabase } from '@/integrations/supabase/client';

// TEMPORARY: Use localStorage until database table is created
const USE_TEMP_STORAGE = true;
const STORAGE_KEY = 'ai_tutor_settings';

export interface AITutorSettings {
  // AI Behavior Settings
  personalityType: string;
  responseStyle: string;
  adaptiveDifficulty: boolean;
  contextAwareness: boolean;
  
  // Learning Parameters
  maxResponseLength: number;
  responseSpeed: string;
  repetitionThreshold: number;
  errorCorrectionStyle: string;
  
  // Voice & Audio
  voiceEnabled: boolean;
  voiceGender: string;
  speechRate: number;
  audioFeedback: boolean;
  
  // Content Customization
  culturalSensitivity: boolean;
  ageAppropriate: boolean;
  professionalContext: boolean;
  customPrompts: string;
  
  // Performance & Analytics
  learningAnalytics: boolean;
  progressTracking: boolean;
  performanceReports: boolean;
  dataRetention: number;
  
  // Advanced Features
  multilingualSupport: boolean;
  emotionalIntelligence: boolean;
  gamificationElements: boolean;
  realTimeAdaptation: boolean;
}

export const defaultAITutorSettings: AITutorSettings = {
  personalityType: 'encouraging',
  responseStyle: 'conversational',
  adaptiveDifficulty: true,
  contextAwareness: true,
  maxResponseLength: 150,
  responseSpeed: 'normal',
  repetitionThreshold: 3,
  errorCorrectionStyle: 'gentle',
  voiceEnabled: true,
  voiceGender: 'neutral',
  speechRate: 1.0,
  audioFeedback: true,
  culturalSensitivity: true,
  ageAppropriate: true,
  professionalContext: false,
  customPrompts: '',
  learningAnalytics: true,
  progressTracking: true,
  performanceReports: true,
  dataRetention: 90,
  multilingualSupport: true,
  emotionalIntelligence: true,
  gamificationElements: true,
  realTimeAdaptation: true
};

export class AITutorSettingsService {
  /**
   * Get AI Tutor settings for the current user
   */
  static async getSettings(): Promise<AITutorSettings> {
    // TEMPORARY: Use localStorage until database table is created
    if (USE_TEMP_STORAGE) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultAITutorSettings, ...parsed };
        }
        return defaultAITutorSettings;
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
        return defaultAITutorSettings;
      }
    }

    try {
      const { data, error } = await supabase
        .from('ai_tutor_settings')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      // If no settings exist, return defaults
      if (!data) {
        return defaultAITutorSettings;
      }

      return {
        personalityType: data.personality_type || defaultAITutorSettings.personalityType,
        responseStyle: data.response_style || defaultAITutorSettings.responseStyle,
        adaptiveDifficulty: data.adaptive_difficulty ?? defaultAITutorSettings.adaptiveDifficulty,
        contextAwareness: data.context_awareness ?? defaultAITutorSettings.contextAwareness,
        maxResponseLength: data.max_response_length || defaultAITutorSettings.maxResponseLength,
        responseSpeed: data.response_speed || defaultAITutorSettings.responseSpeed,
        repetitionThreshold: data.repetition_threshold || defaultAITutorSettings.repetitionThreshold,
        errorCorrectionStyle: data.error_correction_style || defaultAITutorSettings.errorCorrectionStyle,
        voiceEnabled: data.voice_enabled ?? defaultAITutorSettings.voiceEnabled,
        voiceGender: data.voice_gender || defaultAITutorSettings.voiceGender,
        speechRate: data.speech_rate || defaultAITutorSettings.speechRate,
        audioFeedback: data.audio_feedback ?? defaultAITutorSettings.audioFeedback,
        culturalSensitivity: data.cultural_sensitivity ?? defaultAITutorSettings.culturalSensitivity,
        ageAppropriate: data.age_appropriate ?? defaultAITutorSettings.ageAppropriate,
        professionalContext: data.professional_context ?? defaultAITutorSettings.professionalContext,
        customPrompts: data.custom_prompts || defaultAITutorSettings.customPrompts,
        learningAnalytics: data.learning_analytics ?? defaultAITutorSettings.learningAnalytics,
        progressTracking: data.progress_tracking ?? defaultAITutorSettings.progressTracking,
        performanceReports: data.performance_reports ?? defaultAITutorSettings.performanceReports,
        dataRetention: data.data_retention || defaultAITutorSettings.dataRetention,
        multilingualSupport: data.multilingual_support ?? defaultAITutorSettings.multilingualSupport,
        emotionalIntelligence: data.emotional_intelligence ?? defaultAITutorSettings.emotionalIntelligence,
        gamificationElements: data.gamification_elements ?? defaultAITutorSettings.gamificationElements,
        realTimeAdaptation: data.real_time_adaptation ?? defaultAITutorSettings.realTimeAdaptation,
      };
    } catch (error) {
      console.error('Error fetching AI Tutor settings:', error);
      throw new Error('Failed to fetch AI Tutor settings');
    }
  }

  /**
   * Save AI Tutor settings
   */
  static async saveSettings(settings: AITutorSettings): Promise<void> {
    // TEMPORARY: Use localStorage until database table is created
    if (USE_TEMP_STORAGE) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        return;
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
        throw new Error('Failed to save AI Tutor settings');
      }
    }

    try {
      const settingsData = {
        personality_type: settings.personalityType,
        response_style: settings.responseStyle,
        adaptive_difficulty: settings.adaptiveDifficulty,
        context_awareness: settings.contextAwareness,
        max_response_length: settings.maxResponseLength,
        response_speed: settings.responseSpeed,
        repetition_threshold: settings.repetitionThreshold,
        error_correction_style: settings.errorCorrectionStyle,
        voice_enabled: settings.voiceEnabled,
        voice_gender: settings.voiceGender,
        speech_rate: settings.speechRate,
        audio_feedback: settings.audioFeedback,
        cultural_sensitivity: settings.culturalSensitivity,
        age_appropriate: settings.ageAppropriate,
        professional_context: settings.professionalContext,
        custom_prompts: settings.customPrompts,
        learning_analytics: settings.learningAnalytics,
        progress_tracking: settings.progressTracking,
        performance_reports: settings.performanceReports,
        data_retention: settings.dataRetention,
        multilingual_support: settings.multilingualSupport,
        emotional_intelligence: settings.emotionalIntelligence,
        gamification_elements: settings.gamificationElements,
        real_time_adaptation: settings.realTimeAdaptation,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ai_tutor_settings')
        .upsert(settingsData);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving AI Tutor settings:', error);
      throw new Error('Failed to save AI Tutor settings');
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    // TEMPORARY: Use localStorage until database table is created
    if (USE_TEMP_STORAGE) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        return;
      } catch (error) {
        console.error('Error resetting settings:', error);
        throw new Error('Failed to reset AI Tutor settings');
      }
    }

    try {
      await this.saveSettings(defaultAITutorSettings);
    } catch (error) {
      console.error('Error resetting AI Tutor settings:', error);
      throw new Error('Failed to reset AI Tutor settings');
    }
  }

  /**
   * Validate settings before saving
   */
  static validateSettings(settings: AITutorSettings): string[] {
    const errors: string[] = [];

    // Validate max response length
    if (settings.maxResponseLength < 50 || settings.maxResponseLength > 300) {
      errors.push('Max response length must be between 50 and 300 words');
    }

    // Validate repetition threshold
    if (settings.repetitionThreshold < 1 || settings.repetitionThreshold > 10) {
      errors.push('Repetition threshold must be between 1 and 10');
    }

    // Validate speech rate
    if (settings.speechRate < 0.5 || settings.speechRate > 2.0) {
      errors.push('Speech rate must be between 0.5x and 2.0x');
    }

    // Validate data retention
    if (settings.dataRetention < 30 || settings.dataRetention > 365) {
      errors.push('Data retention must be between 30 and 365 days');
    }

    // Validate custom prompts length
    if (settings.customPrompts.length > 1000) {
      errors.push('Custom prompts must be less than 1000 characters');
    }

    return errors;
  }

  /**
   * Get settings that affect AI behavior for runtime use
   */
  static async getRuntimeSettings(): Promise<Partial<AITutorSettings>> {
    try {
      const settings = await this.getSettings();
      
      // Return only settings that affect AI behavior at runtime
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
      };
    } catch (error) {
      console.error('Error fetching runtime settings:', error);
      // Return safe defaults if there's an error
      return {
        personalityType: 'encouraging',
        responseStyle: 'conversational',
        adaptiveDifficulty: true,
        contextAwareness: true,
        maxResponseLength: 150,
        errorCorrectionStyle: 'gentle',
      };
    }
  }
}
