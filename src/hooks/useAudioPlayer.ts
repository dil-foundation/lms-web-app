import { useState, useRef, useCallback } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoaded: boolean;
  duration: number;
  position: number;
  error: string | null;
}

export interface UseAudioPlayerReturn {
  state: AudioPlayerState;
  playAudio: (audioUrl: string) => Promise<void>;
  stopAudio: () => void;
  pauseAudio: () => void;
  resumeAudio: () => Promise<void>;
}

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoaded: false,
    duration: 0,
    position: 0,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (audioUrl: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onloadedmetadata = () => {
        setState(prev => ({
          ...prev,
          isLoaded: true,
          duration: audioRef.current?.duration || 0,
        }));
      };
      
      audioRef.current.ontimeupdate = () => {
        setState(prev => ({
          ...prev,
          position: audioRef.current?.currentTime || 0,
        }));
      };
      
      audioRef.current.onended = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          position: 0,
        }));
      };
      
      audioRef.current.onerror = () => {
        setState(prev => ({
          ...prev,
          error: 'Failed to load audio',
          isPlaying: false,
        }));
      };
      
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to play audio',
        isPlaying: false,
      }));
    }
  }, []);

  const stopAudio = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState(prev => ({
      ...prev,
      isPlaying: false,
      position: 0,
    }));
  }, []);

  const pauseAudio = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resumeAudio = useCallback(async (): Promise<void> => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      } catch (error) {
        console.error('Error resuming audio:', error);
        setState(prev => ({ ...prev, error: 'Failed to resume audio' }));
      }
    }
  }, []);

  return {
    state,
    playAudio,
    stopAudio,
    pauseAudio,
    resumeAudio,
  };
};