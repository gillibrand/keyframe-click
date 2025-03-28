import { useState } from "react";
import { OutputFunctions } from "./OutputFunctions";

/**
 * Types of all global settings.
 */
interface Settings {
  outProperty: string;
  sampleCount: number;
  invertValues: boolean;
  snapToGrid: boolean;
}

/**
 * Validates that a setting is the right type and is a legal value. Used when loading from local
 * storage to be sure the value exists and has not been modified illegally.
 *
 * @param name Name of setting.
 * @param value Saved value to validate.
 * @returns true if the value exists and is valid.
 */
function validate<K extends keyof Settings>(name: K, value: Settings[K]) {
  switch (name) {
    case "sampleCount":
      return typeof value === "number" && value > 3;

    case "invertValues":
    case "snapToGrid":
      return typeof value === "boolean";

    case "outProperty":
      // maybe check actual output functions?
      return typeof value === "string";
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
 * Gets the default value for a setting. Used on first load or if saved data is invalid.
 *
 * @param name Setting name.
 * @returns Default value for that setting.
 */
function getDefault<K extends keyof Settings>(name: K) {
  const defaults: Settings = {
    outProperty: Object.keys(OutputFunctions)[0],
    sampleCount: 10,
    invertValues: false,
    snapToGrid: true,
  };

  return defaults[name];
}

/**
 * Reads a saved setting from local storage. Done on first render. After, we read from the in-memory
 * setting.
 *
 * @param name Base name of the setting.
 * @returns Stored setting value. Default value if missing in storage.
 */
function readSetting<K extends keyof Settings>(name: K): Settings[K] {
  const jsonValue = localStorage.getItem(storageKey(name));

  if (!jsonValue) return getDefault(name);

  const savedValue = JSON.parse(jsonValue);
  if (validate(name, savedValue)) return savedValue;

  return getDefault(name);
}

/**
 * Writes a setting value to local storage.
 *
 * @param name Name of setting.
 * @param value Value to save.
 */
function writeSetting<K extends keyof Settings>(name: K, value: Settings[K]) {
  localStorage.setItem(storageKey(name), JSON.stringify(value));
}

/**
 * Hook to read and write settings. Settings are saved in localStorage automatically. Changes to
 * settings cause a reactive render.
 *
 * New setting names and types must be added to the `Settings` type.
 *
 * @param name Setting name.
 * @returns Save as `useState`, but the setting persists values to local storage.
 */
function useSetting<K extends keyof Settings>(name: K) {
  const [value, setValue] = useState<Settings[K]>(readSetting(name));

  function setValueAndSetting(value: Settings[K]) {
    writeSetting(name, value);
    setValue(value);
  }

  return [value, setValueAndSetting] as const;
}

export { useSetting };
