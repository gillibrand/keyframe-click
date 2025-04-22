import { unreachable } from "@util";
import { useState } from "react";

const TimeUnits = ["ms", "s"] as const;
export type TimeUnit = (typeof TimeUnits)[number];

export interface Duration {
  time: number;
  unit: TimeUnit;
}

const Speeds = [1, 0.5, 0.25, 0.1] as const;
export type Speed = (typeof Speeds)[number];

/** Types of all global settings. */
interface Settings {
  activeLayerId: string;
  isSnapToGrid: boolean;
  isPreviewAutoPlay: boolean;
  isLabelYAxis: boolean;

  previewDurationTime: number;
  previewDurationUnit: TimeUnit;
  previewSpeed: Speed;
}

type SettingName = keyof Settings;

/**
 * Validates that a setting is the right type and is a legal value. Used when loading from local storage to be sure the
 * value exists and has not been modified illegally.
 *
 * @param name Name of setting.
 * @param value Saved value to validate.
 * @returns True if the value exists and is valid.
 */
function validate<K extends SettingName>(name: K, value: Settings[K]) {
  switch (name) {
    case "previewDurationTime":
      return typeof value === "number" && value > 0;

    case "previewDurationUnit":
      return TimeUnits.findIndex((unit) => unit === value) !== -1;

    case "isSnapToGrid":
    case "isLabelYAxis":
    case "isPreviewAutoPlay":
      return typeof value === "boolean";

    case "activeLayerId":
      return typeof value === "string";

    case "previewSpeed":
      return typeof value === "number" && Speeds.includes(value as Speed);

    default: {
      // XXX: this should never happen unless we change setting names. This this will throw cause
      // all settings to reset to default.
      unreachable(name);
      return false;
    }
  }
}

/**
 * Adds common namespace prefix to a base name for setting and getting local storage items.
 *
 * @param name Base key name.
 * @returns A key to use with localStorage.
 */
function storageKey(name: string) {
  return `kc.${name}`;
}

/**
 * Reads a saved setting from local storage. Done on first render. After, we read from the in-memory setting.
 *
 * @param name Base name of the setting.
 * @returns Stored setting value. Default value if missing in storage.
 */
function readSetting<K extends SettingName>(name: K, defaultValue: Settings[K]): Settings[K] {
  const jsonValue = localStorage.getItem(storageKey(name));

  if (!jsonValue) return defaultValue;

  const savedValue = JSON.parse(jsonValue);
  if (validate(name, savedValue)) return savedValue;

  return defaultValue;
}

/**
 * Writes a setting value to local storage.
 *
 * @param name Name of setting.
 * @param value Value to save.
 */
function writeSetting<K extends SettingName>(name: K, value: Settings[K]) {
  localStorage.setItem(storageKey(name), JSON.stringify(value));
}

/**
 * Hook to read and write settings. Settings are saved in localStorage automatically. Changes to settings cause a
 * reactive render.
 *
 * New setting names and types must be added to the `Settings` type.
 *
 * @param name Setting name.
 * @returns Save as `useState`, but the setting persists values to local storage.
 */
function useSetting<K extends SettingName>(name: K, defaultValue: Settings[K]) {
  const [value, setValue] = useState<Settings[K]>(() => readSetting(name, defaultValue));

  function setValueAndSetting(value: Settings[K]) {
    writeSetting(name, value);
    setValue(value);
  }

  return [value, setValueAndSetting] as const;
}

export { useSetting };
