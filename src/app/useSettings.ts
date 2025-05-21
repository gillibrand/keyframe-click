import { Format } from "@export/output";
import { AllGraphics, Graphic } from "@preview/previewTypes";
import { Callback, getOrInit, unreachable } from "@util";
import { useCallback, useSyncExternalStore } from "react";

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
  previewGraphic: Graphic;

  ruleName: string;
  format: Format;
  maxY: number;
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

    case "maxY":
      return typeof value === "number" && value > 10 && value < 10000;

    case "previewDurationUnit":
      return TimeUnits.findIndex((unit) => unit === value) !== -1;

    case "isSnapToGrid":
    case "isLabelYAxis":
    case "isPreviewAutoPlay":
      return typeof value === "boolean";

    case "activeLayerId":
    case "ruleName":
      return typeof value === "string";

    case "previewSpeed":
      return typeof value === "number" && Speeds.includes(value as Speed);

    case "format":
      return value === "css" || value === "js";

    case "previewGraphic":
      return AllGraphics.includes(value as Graphic);

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
function loadSetting<K extends SettingName>(name: K, defaultValue: Settings[K]): Settings[K] {
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
function saveSetting<K extends SettingName>(name: K, value: Settings[K]) {
  localStorage.setItem(storageKey(name), JSON.stringify(value));
}

/**
 * All the listeners, that is, every unique component that has called `useSetting`. Those components will be notified
 * each time a setting in the cache is updated by calling all the callbacks. The callbacks from from React when
 * `useSyncExternalStore` is called.
 *
 * Callbacks are mapped from the setting they are for. This means we only need to notify components that have used the
 * setting being modified. Though if a component loaded multiple settings, it will get several callback.
 */
const listeners = new Map<SettingName, Callback[]>();

/**
 * Add a new listener.
 *
 * @param name Setting name.
 * @param callback A callback to notify the listener that the setting changed.
 */
function addListener(name: SettingName, callback: () => void) {
  const list = getOrInit(listeners, name, []);
  list.push(callback);
}

/**
 * Removes and existing listener.
 *
 * @param name Setting name.
 * @param callback Callback to remove. This must be identical to the added callback.
 */
function removeListener(name: SettingName, callback: () => void) {
  const list = getOrInit(listeners, name, undefined);
  if (list === undefined) return;

  const i = list.indexOf(callback);
  if (i === -1) return;

  list.splice(i, 1);
}

/** Cache of settings after they are first loaded or set. Future reads always come from the cache. */
const cache = new Map<SettingName, Settings[SettingName]>();

/**
 * Gets the best setting from the cache, local storage, or the default. Caches the setting for next time once loaded.
 *
 * @param name Setting name.
 * @param defaultValue Default if setting is missing.
 * @returns The cached, saved, or default setting in that order.
 */
function getSetting<K extends SettingName>(name: K, defaultValue: Settings[K]) {
  if (!cache.has(name)) {
    const savedValue = loadSetting(name, defaultValue);
    cache.set(name, savedValue);
    return savedValue;
  }

  return cache.get(name) as Settings[K];
}

/**
 * Adds setting to cache. Saves to local storage. Notifies listeners of the change.
 *
 * @param name Setting name.
 * @param value New value set.
 */
function setSetting<K extends SettingName>(name: K, value: Settings[K]) {
  const oldValue = cache.get(name);
  if (oldValue === value) return;

  saveSetting(name, value);
  cache.set(name, value);

  // notify listeners
  listeners.get(name)?.forEach((callback) => callback());
}

/**
 * Hook to read and write settings. Settings are saved in localStorage automatically. Changes to settings cause a
 * reactive render. Multiple components can use the same setting--they will all remain in sync globally.
 *
 * There is some overhear to write changes to local storage, so this should not be used for settings that change super
 * frequently. Reads are always fast.
 *
 * One "gotcha" is that each call must pass a default value. The first one called will be used. All calls should really
 * pass the same default so there is never a different default. This feels like a design problem... possibly defaults
 * should be built into this module instead of passed by the callers.
 *
 * New setting names and types must be added to the `Settings` type.
 *
 * @param name Setting name.
 * @returns Same as `useState`, but the setting persists values to local storage.
 */
function useSetting<K extends SettingName>(name: K, defaultValue: Settings[K]) {
  const getSnapshot = useCallback(() => {
    return getSetting(name, defaultValue);
  }, [name, defaultValue]);

  const subscribe = useCallback(
    (onStoreChange: Callback) => {
      addListener(name, onStoreChange);

      return () => removeListener(name, onStoreChange);
    },
    [name]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot);

  const setValue = useCallback(
    (value: Settings[K]) => {
      setSetting(name, value);
    },
    [name]
  );

  return [value, setValue] as const;
}

export { useSetting };
