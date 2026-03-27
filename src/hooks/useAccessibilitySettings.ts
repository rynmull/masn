import { useState, useEffect } from 'react';
import { useStorage } from './useStorage';
import * as SQLite from 'expo-sqlite';

interface AccessibilitySettings {
  scanType: 'automatic' | 'two_switch';
  scanInterval: number;
  dwellTime: number;
  hapticFeedback: boolean;
  auditoryFeedback: boolean;
  auditoryFeedbackVolume: number;
  highContrast: boolean;
  largeText: boolean;
  savePoints: boolean;
  gesturesEnabled: boolean;
  voiceRate: number;
  voicePitch: number;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  scanType: 'automatic',
  scanInterval: 1500,
  dwellTime: 1000,
  hapticFeedback: true,
  auditoryFeedback: true,
  auditoryFeedbackVolume: 1.0,
  highContrast: false,
  largeText: false,
  savePoints: true,
  gesturesEnabled: true,
  voiceRate: 1.0,
  voicePitch: 1.0
};

export const useAccessibilitySettings = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const { getItem, setItem } = useStorage();
  const db = SQLite.openDatabase('masn.db');

  // Load settings from SQLite
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await getItem<Partial<AccessibilitySettings>>('accessibility_settings');
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...stored });
        }
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    };
    
    loadSettings();
  }, [getItem]);

  // Update a single setting
  const updateSetting = async <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await setItem('accessibility_settings', newSettings);
      
      // Update database
      db.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [`accessibility_${key}`, JSON.stringify(value)]
        );
      });
    } catch (error) {
      console.error(`Failed to update ${key}:`, error);
    }
  };

  // Bulk update settings
  const updateSettings = async (newSettings: Partial<AccessibilitySettings>) => {
    try {
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      await setItem('accessibility_settings', merged);
      
      // Bulk update database
      db.transaction(tx => {
        Object.entries(newSettings).forEach(([key, value]) => {
          tx.executeSql(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [`accessibility_${key}`, JSON.stringify(value)]
          );
        });
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return {
    settings,
    updateSetting,
    updateSettings
  };
};