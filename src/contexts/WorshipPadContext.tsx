"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MusicIcon from "@/app/components/icons/MusicIcon";

const WORSHIP_PAD_AUDIO_SRC = "/audio/worship-pad.mp3";
const WORSHIP_PAD_VOLUME = 0.42;

interface WorshipPadContextValue {
  isEnabled: boolean;
  isPlaying: boolean;
  error: string | null;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}

const WorshipPadContext = createContext<WorshipPadContextValue | null>(null);

export function WorshipPadProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio(WORSHIP_PAD_AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = WORSHIP_PAD_VOLUME;
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
    };
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      setIsEnabled(false);
      setError("Could not play the Worship Pad audio.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, []);

  const enable = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setError(null);
    audio.loop = true;
    audio.volume = WORSHIP_PAD_VOLUME;

    void audio
      .play()
      .then(() => {
        setIsEnabled(true);
      })
      .catch(() => {
        setIsEnabled(false);
        setIsPlaying(false);
        setError("Tap Enable Worship Pad again to start the audio.");
      });
  }, []);

  const disable = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsEnabled(false);
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isEnabled || isPlaying) {
      disable();
      return;
    }

    enable();
  }, [disable, enable, isEnabled, isPlaying]);

  const value = useMemo(
    () => ({ isEnabled, isPlaying, error, enable, disable, toggle }),
    [disable, enable, error, isEnabled, isPlaying, toggle],
  );

  return (
    <WorshipPadContext.Provider value={value}>
      {children}
      <WorshipPadFloatingStatus />
    </WorshipPadContext.Provider>
  );
}

export function useWorshipPad() {
  const context = useContext(WorshipPadContext);

  if (!context) {
    throw new Error("useWorshipPad must be used inside WorshipPadProvider");
  }

  return context;
}

function WorshipPadFloatingStatus() {
  const { isEnabled, isPlaying, error, disable } = useWorshipPad();

  if (!isEnabled && !isPlaying && !error) return null;

  return (
    <button
      type="button"
      onClick={disable}
      className="fixed bottom-3 right-2 z-[45] flex items-center gap-1.5 rounded-full border border-border/50 bg-surface/70 px-2 py-1 text-[10px] font-semibold text-text/65 shadow-sm shadow-background/30 backdrop-blur-md transition hover:bg-surface hover:text-text sm:bottom-4 sm:right-4 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]"
      title={error ? error : "Worship Pad playing — tap to stop"}
      aria-label={error ? error : "Worship Pad playing. Tap to stop."}
    >
      <MusicIcon className="h-3 w-3 text-primary/80 sm:h-[13px] sm:w-[13px]" />
      <span>
        {error ? (
          <>
            <span className="hidden sm:inline">Worship </span>Pad paused
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Worship </span>Pad playing
          </>
        )}
      </span>
      {!error && (
        <span className="flex items-end gap-[2px]" aria-hidden="true">
          <span className="h-1 w-[2px] animate-pulse rounded-full bg-primary/50 sm:h-1.5" />
          <span className="h-2 w-[2px] animate-pulse rounded-full bg-primary/70 [animation-delay:120ms] sm:h-2.5" />
          <span className="h-1 w-[2px] animate-pulse rounded-full bg-primary/50 [animation-delay:240ms]" />
        </span>
      )}
    </button>
  );
}
