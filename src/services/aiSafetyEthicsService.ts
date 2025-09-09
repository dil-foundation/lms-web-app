import { supabase } from '@/integrations/supabase/client';

export interface AISafetyEthicsSettings {
  // Content Safety
  contentFiltering: boolean;
  toxicityDetection: boolean;
  biasDetection: boolean;
  inappropriateContentBlocking: boolean;
  harmfulContentPrevention: boolean;
  misinformationDetection: boolean;
  
  // Privacy & Data Protection
  dataEncryption: boolean;
  personalDataProtection: boolean;
  conversationLogging: boolean;
  dataRetentionLimit: number;
  
  // Bias & Fairness
  genderBiasMonitoring: boolean;
  culturalBiasDetection: boolean;
  ageAppropriateResponses: boolean;
  inclusiveLanguage: boolean;
  emotionalSafetyChecks: boolean;
  
  // Monitoring & Alerts
  realTimeMonitoring: boolean;
  alertThreshold: number;
  automaticEscalation: boolean;
  adminNotifications: boolean;
  contextualSafetyAnalysis: boolean;
  
  // Compliance & Reporting
  complianceReporting: boolean;
  auditTrail: boolean;
  incidentReporting: boolean;
  regularAssessments: boolean;
}

export const defaultAISafetyEthicsSettings: AISafetyEthicsSettings = {
  // Content Safety
  contentFiltering: true,
  toxicityDetection: true,
  biasDetection: true,
  inappropriateContentBlocking: true,
  harmfulContentPrevention: true,
  misinformationDetection: true,
  
  // Privacy & Data Protection
  dataEncryption: true,
  personalDataProtection: true,
  conversationLogging: true,
  dataRetentionLimit: 90,
  
  // Bias & Fairness
  genderBiasMonitoring: true,
  culturalBiasDetection: true,
  ageAppropriateResponses: true,
  inclusiveLanguage: true,
  emotionalSafetyChecks: true,
  
  // Monitoring & Alerts
  realTimeMonitoring: true,
  alertThreshold: 75,
  automaticEscalation: true,
  adminNotifications: true,
  contextualSafetyAnalysis: true,
  
  // Compliance & Reporting
  complianceReporting: true,
  auditTrail: true,
  incidentReporting: true,
  regularAssessments: true
};

export class AISafetyEthicsService {
  /**
   * Get AI Safety & Ethics settings
   */
  static async getSettings(): Promise<AISafetyEthicsSettings> {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        throw new Error('Access denied: Admin role required');
      }

      // Use the database function to get settings with defaults
      const { data, error } = await supabase
        .rpc('get_ai_safety_ethics_settings');

      if (error) {
        throw error;
      }

      // If no data returned, use defaults
      if (!data || data.length === 0) {
        return defaultAISafetyEthicsSettings;
      }

      const settings = data[0];
      return {
        contentFiltering: settings.content_filtering,
        toxicityDetection: settings.toxicity_detection,
        biasDetection: settings.bias_detection,
        inappropriateContentBlocking: settings.inappropriate_content_blocking,
        harmfulContentPrevention: settings.harmful_content_prevention,
        misinformationDetection: settings.misinformation_detection,
        dataEncryption: settings.data_encryption,
        personalDataProtection: settings.personal_data_protection,
        conversationLogging: settings.conversation_logging,
        dataRetentionLimit: settings.data_retention_limit,
        genderBiasMonitoring: settings.gender_bias_monitoring,
        culturalBiasDetection: settings.cultural_bias_detection,
        ageAppropriateResponses: settings.age_appropriate_responses,
        inclusiveLanguage: settings.inclusive_language,
        emotionalSafetyChecks: settings.emotional_safety_checks,
        realTimeMonitoring: settings.real_time_monitoring,
        alertThreshold: settings.alert_threshold,
        automaticEscalation: settings.automatic_escalation,
        adminNotifications: settings.admin_notifications,
        contextualSafetyAnalysis: settings.contextual_safety_analysis,
        complianceReporting: settings.compliance_reporting,
        auditTrail: settings.audit_trail,
        incidentReporting: settings.incident_reporting,
        regularAssessments: settings.regular_assessments,
      };
    } catch (error) {
      console.error('Error fetching AI Safety & Ethics settings:', error);
      throw new Error('Failed to fetch AI Safety & Ethics settings');
    }
  }

  /**
   * Save AI Safety & Ethics settings
   */
  static async saveSettings(settings: AISafetyEthicsSettings): Promise<void> {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        throw new Error('Access denied: Admin role required');
      }

      // Validate settings
      const validationErrors = this.validateSettings(settings);
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
      }

      const settingsData = {
        content_filtering: settings.contentFiltering,
        toxicity_detection: settings.toxicityDetection,
        bias_detection: settings.biasDetection,
        inappropriate_content_blocking: settings.inappropriateContentBlocking,
        harmful_content_prevention: settings.harmfulContentPrevention,
        misinformation_detection: settings.misinformationDetection,
        data_encryption: settings.dataEncryption,
        personal_data_protection: settings.personalDataProtection,
        conversation_logging: settings.conversationLogging,
        data_retention_limit: settings.dataRetentionLimit,
        gender_bias_monitoring: settings.genderBiasMonitoring,
        cultural_bias_detection: settings.culturalBiasDetection,
        age_appropriate_responses: settings.ageAppropriateResponses,
        inclusive_language: settings.inclusiveLanguage,
        emotional_safety_checks: settings.emotionalSafetyChecks,
        real_time_monitoring: settings.realTimeMonitoring,
        alert_threshold: settings.alertThreshold,
        automatic_escalation: settings.automaticEscalation,
        admin_notifications: settings.adminNotifications,
        contextual_safety_analysis: settings.contextualSafetyAnalysis,
        compliance_reporting: settings.complianceReporting,
        audit_trail: settings.auditTrail,
        incident_reporting: settings.incidentReporting,
        regular_assessments: settings.regularAssessments,
      };

      // Check if settings exist, if so update, otherwise insert
      const { data: existingSettings } = await supabase
        .from('ai_safety_ethics_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (existingSettings && existingSettings.length > 0) {
        // Update existing settings
        const { error } = await supabase
          .from('ai_safety_ethics_settings')
          .update(settingsData)
          .eq('id', existingSettings[0].id);

        if (error) {
          throw error;
        }
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('ai_safety_ethics_settings')
          .insert(settingsData);

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error saving AI Safety & Ethics settings:', error);
      throw new Error('Failed to save AI Safety & Ethics settings');
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    try {
      await this.saveSettings(defaultAISafetyEthicsSettings);
    } catch (error) {
      console.error('Error resetting AI Safety & Ethics settings:', error);
      throw new Error('Failed to reset AI Safety & Ethics settings');
    }
  }

  /**
   * Validate settings before saving
   */
  static validateSettings(settings: AISafetyEthicsSettings): string[] {
    const errors: string[] = [];

    // Validate data retention limit
    if (settings.dataRetentionLimit < 30 || settings.dataRetentionLimit > 365) {
      errors.push('Data retention limit must be between 30 and 365 days');
    }

    // Validate alert threshold
    if (settings.alertThreshold < 50 || settings.alertThreshold > 100) {
      errors.push('Alert threshold must be between 50% and 100%');
    }

    return errors;
  }

  /**
   * Get safety metrics (mock data for now - can be replaced with real metrics later)
   */
  static async getSafetyMetrics(): Promise<{
    contentFiltered: number;
    biasDetected: number;
    incidentsReported: number;
    complianceScore: number;
  }> {
    // This would typically fetch real metrics from the database
    // For now, return mock data
    return {
      contentFiltered: 127,
      biasDetected: 23,
      incidentsReported: 5,
      complianceScore: 94
    };
  }
}
