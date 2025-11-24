import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';

/**
 * Converts text to speech using the /tts API endpoint
 * @param text - The text to convert to speech
 * @returns A blob URL that can be used with Audio element or useAudioPlayer hook
 */
export const textToSpeech = async (text: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.TTS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
    }

    // Get the audio blob from the response
    const audioBlob = await response.blob();
    
    // Create a blob URL that can be used to play the audio
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return audioUrl;
  } catch (error) {
    console.error('Error calling TTS API:', error);
    throw error;
  }
};

