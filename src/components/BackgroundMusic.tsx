
import React, { useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export const BackgroundMusic: React.FC = () => {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // User provided tracks
  const TRACKS = [
    "https://www.image2url.com/r2/default/audio/1780586451754-a71c6656-c6d1-4529-8270-4f6c88f8c2f6.mp3",
    "https://www.image2url.com/r2/default/audio/1780587169410-dc46c324-02ed-419a-a251-6abf4a07feb0.mp3",
    "https://www.image2url.com/r2/default/audio/1780587872159-c42a31fa-dfb5-40c6-901f-f9bfaa530765.mp3"
  ];
  
  const DEFAULT_FALLBACK = "https://www.chosic.com/wp-content/uploads/2021/04/Funny-Bunny.mp3";

  // Pick a random track on mount
  const initialTrackRef = useRef(TRACKS[Math.floor(Math.random() * TRACKS.length)]);
  const [currentSrc, setCurrentSrc] = React.useState(initialTrackRef.current);

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
    
    console.error("Audio Load Error for:", audio.src);
    
    // Logic: If one track fails, try the other. If all tracks fail, use fallback.
    const currentIndex = TRACKS.indexOf(currentSrc);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % TRACKS.length;
      if (nextIndex !== currentIndex) {
        console.log("Switching to next user track because current failed.");
        setCurrentSrc(TRACKS[nextIndex]);
      } else {
        console.log("All user tracks failed or only one provided. Switching to default fallback.");
        setCurrentSrc(DEFAULT_FALLBACK);
      }
    } else if (currentSrc !== DEFAULT_FALLBACK) {
      setCurrentSrc(DEFAULT_FALLBACK);
    }
  };

  const changeToRandomTrack = React.useCallback(() => {
    const remainingTracks = TRACKS.filter(t => t !== currentSrc);
    const nextTrack = remainingTracks.length > 0 
      ? remainingTracks[Math.floor(Math.random() * remainingTracks.length)]
      : TRACKS[Math.floor(Math.random() * TRACKS.length)];
    
    console.log("Switching to next random track:", nextTrack);
    setCurrentSrc(nextTrack);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [currentSrc, TRACKS]);

  return (
    <audio
      ref={audioRef}
      src={currentSrc}
      onError={handleLoadError}
      onEnded={changeToRandomTrack}
      onCanPlayThrough={() => {
        if (settings.bgMusicEnabled && audioRef.current?.paused) {
          attemptPlay();
        }
      }}
      preload="auto"
      referrerPolicy="no-referrer"
      style={{ display: 'none' }}
    />
  );
};
