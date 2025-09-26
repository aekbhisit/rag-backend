import React, { useState, useEffect, useRef } from 'react';

interface VolumeControlProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  className?: string;
}

const VOLUME_STORAGE_KEY = 'openai_audio_volume';
const DEFAULT_VOLUME = 1.0;

const VolumeControl: React.FC<VolumeControlProps> = ({ audioRef, className = '' }) => {
  const [volume, setVolume] = useState<number>(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const previousVolumeRef = useRef<number>(DEFAULT_VOLUME);
  
  // Load volume from localStorage on initial render
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (savedVolume !== null) {
        const volumeLevel = parseFloat(savedVolume);
        if (!isNaN(volumeLevel) && volumeLevel >= 0 && volumeLevel <= 1) {
          setVolume(volumeLevel);
          previousVolumeRef.current = volumeLevel;
          
          // Set initial muted state
          setIsMuted(volumeLevel === 0);
        }
      }
    } catch (e) {
      console.warn('[VolumeControl] Could not load volume:', e);
    }
    
    // Sync with audio element when it becomes available
    const syncWithAudioElement = () => {
      if (audioRef.current) {
        // Apply the current volume state to the audio element
        audioRef.current.volume = volume;
        audioRef.current.muted = isMuted;
      }
    };
    
    // Setup an interval to check for audio element
    const intervalId = setInterval(() => {
      if (audioRef.current) {
        syncWithAudioElement();
        clearInterval(intervalId);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Update audio element when volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      
      // Save to localStorage
      try {
        localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
      } catch (e) {
        console.warn('[VolumeControl] Could not save volume:', e);
      }
    }
  }, [volume, audioRef]);
  
  // Update audio element when mute state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isMuted) {
        // Store current volume before muting
        previousVolumeRef.current = volume > 0 ? volume : DEFAULT_VOLUME;
        audioRef.current.volume = 0;
        setVolume(0);
      } else {
        // Restore previous volume
        const restoreVolume = previousVolumeRef.current || DEFAULT_VOLUME;
        audioRef.current.volume = restoreVolume;
        setVolume(restoreVolume);
      }
    }
  }, [isMuted, audioRef]);
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    // Update mute state based on volume
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Determine which volume icon to show
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      );
    } else if (volume < 0.5) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12V4zm3.025 4a4.486 4.486 0 0 1-1.318 3.182L10 10.475A3.489 3.489 0 0 0 11.025 8 3.49 3.49 0 0 0 10 5.525l.707-.707A4.486 4.486 0 0 1 12.025 8z"/>
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
          <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
          <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
        </svg>
      );
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-1 rounded-md hover:bg-gray-200 transition-colors"
        aria-label={isMuted ? "Unmute" : "Adjust volume"}
      >
        <div className="w-6 h-6 flex items-center justify-center" onClick={toggleMute}>
          {getVolumeIcon()}
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 p-2 bg-white rounded-md shadow-lg flex flex-col items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-4"
          />
          <div className="mt-1 text-xs">{Math.round(volume * 100)}%</div>
        </div>
      )}
    </div>
  );
};

export default VolumeControl; 