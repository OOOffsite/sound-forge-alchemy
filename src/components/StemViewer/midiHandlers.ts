import { useCallback } from "react";
import type { Stem } from "./StemViewer";

export function useMIDIControlChange(
  stems: Stem[],
  setMasterVolume: (v: number) => void,
  updateStemVolume: (id: string, v: number) => void
) {
  return useCallback(
    (cc: number, value: number) => {
      const normalizedValue = value / 127;
      switch (cc) {
        case 1:
          setMasterVolume(normalizedValue);
          break;
        case 2:
          if (stems.length > 0) {
            updateStemVolume(stems[0].id, normalizedValue);
          }
          break;
      }
    },
    [stems, setMasterVolume, updateStemVolume]
  );
}

export function useMIDINoteOn(
  togglePlayPause: () => void,
  stopPlayback: () => void,
  toggleLoopActive: () => void
) {
  return useCallback(
    (note: number, velocity: number) => {
      switch (note) {
        case 36:
          togglePlayPause();
          break;
        case 37:
          stopPlayback();
          break;
        case 38:
          toggleLoopActive();
          break;
      }
    },
    [togglePlayPause, stopPlayback, toggleLoopActive]
  );
}
