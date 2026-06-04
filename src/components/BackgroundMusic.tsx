
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
      
      const unlockAudio = () => {
        console.log("User interaction detected, unlocking audio...");
        attemptPlay();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });

      // Periodically check if it should be playing but isn't
      const checkInterval = setInterval(() => {
        if (settings.bgMusicEnabled && audio.paused) {
          attemptPlay();
        }
      }, 3000);

      return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        clearInterval(checkInterval);
      };
    } else {
      audio.pause();
    }
  }, [settings.bgMusicEnabled]);

  const handleLoadError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const target = e.target as HTMLAudioElement;
    console.error("Audio Load Error:", {
      status: target.networkState,
      readyState: target.readyState,
      src: target.src,
      error: target.error
    });
    
    // If we're not already using the fallback, try it
    if (!audio.src.includes("chosic.com")) {
      console.log("Primary music failed. Switching to default fallback...");
      audio.src = DEFAULT_FALLBACK;
      audio.load();
      if (settings.bgMusicEnabled) {
        audio.play().catch(err => console.warn("Fallback music also failed:", err));
      }
    }
  };

  return (
    <audio
      ref={audioRef}
      src={MUSIC_URL}
      onError={handleLoadError}
      onCanPlayThrough={() => {
        if (settings.bgMusicEnabled && audioRef.current?.paused) {
          attemptPlay();
        }
      }}
      loop
      preload="auto"
      referrerPolicy="no-referrer"
      style={{ display: 'none' }}
    />
  );
};
