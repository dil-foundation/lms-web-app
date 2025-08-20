import { useState, useEffect, useCallback } from 'react';
import { AITutorSettings, AITutorSettingsService, defaultAITutorSettings } from '@/services/aiTutorSettingsService';
import { toast } from 'sonner';

export interface UseAITutorSettingsReturn {
  settings: AITutorSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateSettings: (newSettings: Partial<AITutorSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
}

export const useAITutorSettings = (): UseAITutorSettingsReturn => {
  const [settings, setSettings] = useState<AITutorSettings>(defaultAITutorSettings);
  const [originalSettings, setOriginalSettings] = useState<AITutorSettings>(defaultAITutorSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Load settings from the backend
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSettings = await AITutorSettingsService.getSettings();
      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings locally (doesn't save to backend)
  const updateSettings = useCallback((newSettings: Partial<AITutorSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Validate settings in real-time
      const errors = AITutorSettingsService.validateSettings(updated);
      setValidationErrors(errors);
      
      return updated;
    });
  }, []);

  // Save settings to backend
  const saveSettings = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate before saving
      const errors = AITutorSettingsService.validateSettings(settings);
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error('Please fix validation errors before saving');
        return;
      }

      await AITutorSettingsService.saveSettings(settings);
      setOriginalSettings(settings);
      setValidationErrors([]);
      toast.success('AI Tutor settings saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so component can handle it
    } finally {
      setSaving(false);
    }
  }, [settings]);

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      
      await AITutorSettingsService.resetSettings();
      const resetSettings = defaultAITutorSettings;
      setSettings(resetSettings);
      setOriginalSettings(resetSettings);
      setValidationErrors([]);
      toast.success('AI Tutor settings reset to defaults');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // Refresh settings from backend
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Warn user about unsaved changes when leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    saveSettings,
    resetSettings,
    refreshSettings,
    hasUnsavedChanges,
    validationErrors,
  };
};
