import { useState, useCallback } from 'react';

export interface TextOverlaySettings {
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // pixels
  color: string; // hex color
}

export interface MusicSettings {
  file: File | null;
  url: string | null;
  volume: number; // 0-100
  fadeIn: boolean;
  fadeOut: boolean;
  startOffset: number; // seconds to skip at start of music
}

export interface FilterSettings {
  brightness: number; // percentage, 100 = normal
  contrast: number; // percentage, 100 = normal
  saturation: number; // percentage, 100 = normal
}

export interface VideoEditSettings {
  trimStart: number;
  trimEnd: number;
  coverTime: number | null;
  textOverlay: TextOverlaySettings | null;
  music: MusicSettings | null;
  filters: FilterSettings;
}

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100
};

const DEFAULT_SETTINGS: VideoEditSettings = {
  trimStart: 0,
  trimEnd: 0,
  coverTime: null,
  textOverlay: null,
  music: null,
  filters: DEFAULT_FILTERS
};

export const useVideoEditor = () => {
  const [settings, setSettings] = useState<VideoEditSettings>(DEFAULT_SETTINGS);

  const updateTrim = useCallback((start: number, end: number) => {
    setSettings(prev => ({
      ...prev,
      trimStart: start,
      trimEnd: end
    }));
  }, []);

  const updateCover = useCallback((time: number | null) => {
    setSettings(prev => ({
      ...prev,
      coverTime: time
    }));
  }, []);

  const updateTextOverlay = useCallback((overlay: TextOverlaySettings | null) => {
    setSettings(prev => ({
      ...prev,
      textOverlay: overlay
    }));
  }, []);

  const updateMusic = useCallback((music: MusicSettings | null) => {
    setSettings(prev => ({
      ...prev,
      music: music
    }));
  }, []);

  const updateFilters = useCallback((filters: FilterSettings) => {
    setSettings(prev => ({
      ...prev,
      filters
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(prev => ({
      ...DEFAULT_SETTINGS,
      trimEnd: prev.trimEnd // Keep the video duration
    }));
  }, []);

  const getSettingsForBackend = useCallback((): Omit<VideoEditSettings, 'music'> & { musicUrl?: string } => {
    // Prepare settings for backend processing (exclude File objects)
    const { music, ...rest } = settings;
    return {
      ...rest,
      ...(music?.url && { musicUrl: music.url })
    };
  }, [settings]);

  return {
    settings,
    updateTrim,
    updateCover,
    updateTextOverlay,
    updateMusic,
    updateFilters,
    resetSettings,
    getSettingsForBackend
  };
};
