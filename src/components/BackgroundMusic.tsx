
import React, { useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export const BackgroundMusic: React.FC = () => {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // The music URL provided by the user
  const PRIMARY_MUSIC_URL = "https://www.image2url.com/r2/default/audio/1780586451754-a71c6656-c6d1-4529-8270-4f6c88f8c2f6.mp3";
  const DEFAULT_FALLBACK = "https://www.chosic.com/wp-content/uploads/2021/04/Funny-Bunny.mp3";
  const MUSIC_URL = PRIMARY_MUSIC_URL; 

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = settings.bgMusicVolume;
  }, [settings.bgMusicVolume]);

  const attemptPlay = () => {
    const audio = audioRef.current;
    if (!audio || !settings.bgMusicEnabled) return;
    
    if (audio.paused) {
      audio.play().catch(error => {
        console.warn("Retrying playback on next interaction due to error:", error);
      });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (settings.bgMusicEnabled) {
      attemptPlay();
      
      // Global listener to "unlock" audio on first user interaction
      const unlockAudio = () => {
        attemptPlay();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);

      return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
    } else {
      audio.pause();
    }
  }, [settings.bgMusicEnabled]);

  const handleLoadError = () => {
    if (audioRef.current) {
      if (audioRef.current.src === PRIMARY_MUSIC_URL) {
        console.log("Primary music URL failed, switching to fallback");
        audioRef.current.src = DEFAULT_FALLBACK;
        if (settings.bgMusicEnabled) {
          audioRef.current.play().catch(e => console.warn("Audio fallback play failed", e));
        }
      }
    }
  };

  return (
    <audio
      ref={audioRef}
      src={MUSIC_URL}
      onError={handleLoadError}
      onCanPlayThrough={attemptPlay}
      loop
      preload="auto"
      style={{ display: 'none' }}
    />
  );
};
