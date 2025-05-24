import { create } from "zustand";

/** Global state fo the timeline that can be set from both the demo and timeline page. */
export interface TimelineState {
  /** Whether the timeline should loop when it reaches the end. */
  isRepeat: boolean;

  /** Set whether the timeline should loop when it reaches the end. */
  setIsRepeat: (repeat: boolean) => void;
}

/** Zustand store for managing the timeline state. */
export const useTimelineStore = create<TimelineState>((set) => ({
  isRepeat: false,
  setIsRepeat: (repeat: boolean) => set({ isRepeat: repeat }),
}));
