import { AITutorSettings } from '@/services/aiTutorSettingsService';

export interface AITutorPromptConfig {
  systemPrompt: string;
  personalityInstructions: string;
  responseStyleInstructions: string;
  errorCorrectionInstructions: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Generate AI tutor system prompt based on settings
 */
export const generateAITutorPrompt = (settings: Partial<AITutorSettings>, context?: {
  lessonType?: string;
  userAge?: number;
  userLevel?: string;
  culturalBackground?: string;
}): AITutorPromptConfig => {
  let systemPrompt = "You are an AI English tutor helping students improve their language skills.";
  
  // Add personality instructions
  const personalityInstructions = getPersonalityInstructions(settings.personalityType || 'encouraging');
  
  // Add response style instructions
  const responseStyleInstructions = getResponseStyleInstructions(settings.responseStyle || 'conversational');
  
  // Add error correction instructions
  const errorCorrectionInstructions = getErrorCorrectionInstructions(settings.errorCorrectionStyle || 'gentle');
  
  // Build complete system prompt
  systemPrompt += `\n\n${personalityInstructions}`;
  systemPrompt += `\n\n${responseStyleInstructions}`;
  systemPrompt += `\n\n${errorCorrectionInstructions}`;
  
  // Add cultural sensitivity
  if (settings.culturalSensitivity) {
    systemPrompt += "\n\nBe culturally sensitive and respectful of diverse backgrounds and perspectives.";
  }
  
  // Add age-appropriate content
  if (settings.ageAppropriate && context?.userAge) {
    systemPrompt += `\n\nEnsure all content is appropriate for a ${context.userAge}-year-old learner.`;
  }
  
  // Add professional context
  if (settings.professionalContext) {
    systemPrompt += "\n\nFocus on professional and business English scenarios when relevant.";
  }
  
  // Add custom prompts
  if (settings.customPrompts) {
    systemPrompt += `\n\nAdditional instructions: ${settings.customPrompts}`;
  }
  
  
  // Add emotional intelligence
  if (settings.emotionalIntelligence) {
    systemPrompt += "\n\nBe aware of the student's emotional state and respond with empathy and encouragement.";
  }
  
  // Add real-time adaptation
  if (settings.realTimeAdaptation) {
    systemPrompt += "\n\nContinuously adapt your teaching approach based on the student's immediate responses and needs.";
  }
  
  // Calculate max tokens based on response length setting
  const maxTokens = Math.floor((settings.maxResponseLength || 150) * 1.3); // Rough conversion from words to tokens
  
  // Set temperature based on response style
  const temperature = getTemperatureForStyle(settings.responseStyle || 'conversational');
  
  return {
    systemPrompt,
    personalityInstructions,
    responseStyleInstructions,
    errorCorrectionInstructions,
    maxTokens,
    temperature
  };
};

/**
 * Get personality-specific instructions
 */
const getPersonalityInstructions = (personalityType: string): string => {
  switch (personalityType) {
    case 'encouraging':
      return "Be encouraging, supportive, and positive. Celebrate successes and provide gentle motivation during challenges.";
    case 'professional':
      return "Maintain a professional, direct, and efficient communication style. Focus on clear, structured feedback.";
    case 'friendly':
      return "Be warm, friendly, and casual in your interactions. Create a comfortable, relaxed learning environment.";
    case 'academic':
      return "Use a formal, academic tone with detailed explanations and structured learning approaches.";
    default:
      return "Be encouraging, supportive, and positive. Celebrate successes and provide gentle motivation during challenges.";
  }
};

/**
 * Get response style instructions
 */
const getResponseStyleInstructions = (responseStyle: string): string => {
  switch (responseStyle) {
    case 'conversational':
      return "Use a natural, conversational tone as if speaking with a friend. Keep responses engaging and interactive.";
    case 'structured':
      return "Organize your responses clearly with bullet points, numbered lists, or clear sections when appropriate.";
    case 'interactive':
      return "Ask questions, encourage participation, and create opportunities for the student to engage actively.";
    case 'concise':
      return "Keep responses brief and to the point while still being helpful and clear.";
    default:
      return "Use a natural, conversational tone as if speaking with a friend. Keep responses engaging and interactive.";
  }
};

/**
 * Get error correction instructions
 */
const getErrorCorrectionInstructions = (errorCorrectionStyle: string): string => {
  switch (errorCorrectionStyle) {
    case 'gentle':
      return "When correcting errors, be gentle and encouraging. Frame corrections as learning opportunities rather than mistakes.";
    case 'direct':
      return "Provide clear, direct corrections when errors occur. Be straightforward but respectful.";
    case 'detailed':
      return "When correcting errors, provide detailed explanations of why something is incorrect and how to improve.";
    case 'minimal':
      return "Only correct major errors that impede understanding. Allow minor mistakes to pass to maintain flow.";
    default:
      return "When correcting errors, be gentle and encouraging. Frame corrections as learning opportunities rather than mistakes.";
  }
};

/**
 * Get temperature setting based on response style
 */
const getTemperatureForStyle = (responseStyle: string): number => {
  switch (responseStyle) {
    case 'conversational':
      return 0.7;
    case 'structured':
      return 0.3;
    case 'interactive':
      return 0.8;
    case 'concise':
      return 0.4;
    default:
      return 0.7;
  }
};


/**
 * Check if gamification should be applied
 */
export const shouldApplyGamification = (settings: Partial<AITutorSettings>): boolean => {
  return settings.gamificationElements === true;
};

/**
 * Get repetition threshold for help
 */
export const getRepetitionThreshold = (): number => {
  return 3; // Fixed threshold since this setting was removed
};

