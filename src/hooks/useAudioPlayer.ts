import { useState, useRef, useCallback, useEffect } from 'react';

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

  // Cleanup current audio properly
  const cleanupCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      
      // Remove all event listeners to prevent memory leaks
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadstart = null;
      audio.onloadeddata = null;
      
      audioRef.current = null;
    }
  }, []);

  // Cleanup effect to stop audio when component unmounts
  useEffect(() => {
    return () => {
      cleanupCurrentAudio();
    };
  }, [cleanupCurrentAudio]);

  const playAudio = useCallback(async (audioUrl: string): Promise<void> => {
    try {
      console.log('🎵 useAudioPlayer: Starting playAudio with URL:', audioUrl);
      setState(prev => ({ ...prev, error: null }));
      
      // Stop and cleanup any currently playing audio
      cleanupCurrentAudio();
      
      console.log('🎵 useAudioPlayer: Creating new Audio element');
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onloadedmetadata = () => {
        console.log('🎵 useAudioPlayer: Audio metadata loaded');
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
        console.log('🎵 useAudioPlayer: Audio playback ended');
        setState(prev => ({
          ...prev,
          isPlaying: false,
          position: 0,
        }));
      };
      
      audioRef.current.onerror = (e) => {
        console.error('🎵 useAudioPlayer: Audio error:', e);
        setState(prev => ({
          ...prev,
          error: 'Failed to load audio',
          isPlaying: false,
        }));
      };
      
      console.log('🎵 useAudioPlayer: Attempting to play audio');
      await audioRef.current.play();
      console.log('🎵 useAudioPlayer: Audio playback started successfully');
      setState(prev => ({ ...prev, isPlaying: true }));
      
    } catch (error) {
      console.error('🎵 useAudioPlayer: Error playing audio:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to play audio',
        isPlaying: false,
      }));
    }
  }, [cleanupCurrentAudio]);

  const stopAudio = useCallback((): void => {
    cleanupCurrentAudio();
    setState(prev => ({
      ...prev,
      isPlaying: false,
      position: 0,
    }));
  }, [cleanupCurrentAudio]);

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