// TEMPORARY VERSION - Uses localStorage instead of Supabase
// Replace this with the real service once the database table is created

import { AITutorSettings, defaultAITutorSettings } from './aiTutorSettingsService';

const STORAGE_KEY = 'ai_tutor_settings';

export class AITutorSettingsServiceTemp {
  /**
   * Get AI Tutor settings from localStorage
   */
  static async getSettings(): Promise<AITutorSettings> {
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

  /**
   * Save AI Tutor settings to localStorage
   */
  static async saveSettings(settings: AITutorSettings): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      throw new Error('Failed to save AI Tutor settings');
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw new Error('Failed to reset AI Tutor settings');
    }
  }

  /**
   * Validate settings before saving
   */
  static validateSettings(settings: AITutorSettings): string[] {
    const errors: string[] = [];

    if (settings.maxResponseLength < 50 || settings.maxResponseLength > 300) {
      errors.push('Max response length must be between 50 and 300 words');
    }

    if (settings.repetitionThreshold < 1 || settings.repetitionThreshold > 10) {
      errors.push('Repetition threshold must be between 1 and 10');
    }

    if (settings.speechRate < 0.5 || settings.speechRate > 2.0) {
      errors.push('Speech rate must be between 0.5x and 2.0x');
    }

    if (settings.dataRetention < 30 || settings.dataRetention > 365) {
      errors.push('Data retention must be between 30 and 365 days');
    }

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
