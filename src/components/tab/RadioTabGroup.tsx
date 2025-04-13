import Plus from "@images/plus.svg?react";
import { useChildAnimator } from "@util/useChildAnimator";
import { useCallback, useState } from "react";
import { RadioTab } from "./RadioTab";
import "./tab.css";

export const Colors = {
  amber: "oklch(0.555 0.163 48.998)",
  blue: "oklch(0.488 0.243 264.376)",
  cyan: "oklch(0.52 0.105 223.128)",
  emerald: "oklch(0.508 0.118 165.612)",
  fuchsia: "oklch(0.518 0.253 323.949)",
  gray: "oklch(0.373 0.034 259.733)",
  green: "oklch(0.527 0.154 150.069)",
  indigo: "oklch(0.457 0.24 277.023)",
  lime: "oklch(0.532 0.157 131.589)",
  neutral: "oklch(0.371 0 0)",
  orange: "oklch(0.553 0.195 38.402)",
  pink: "oklch(0.525 0.223 3.958)",
  purple: "oklch(0.496 0.265 301.924)",
  red: "oklch(0.505 0.213 27.518)",
  rose: "oklch(0.514 0.222 16.935)",
  sky: "oklch(0.5 0.134 242.749)",
  slate: "oklch(0.372 0.044 257.287)",
  stone: "oklch(0.374 0.01 67.558)",
  teal: "oklch(0.511 0.096 186.391)",
  violet: "oklch(0.491 0.27 292.581)",
  yellow: "oklch(0.554 0.135 66.442)",
  zinc: "oklch(0.37 0.013 285.805)",
} as const;

export type Color = keyof typeof Colors;

export interface TabData {
  label: string;
  color: Color;
  value: string;
}

interface Props {
  name: string;
  tabs: TabData[];
  onDelete: (value: string) => void;
  onNew: () => void;
}

export function RadioTabGroup({ tabs, name, onDelete, onNew }: Props) {
  const [selectedValue, setSelectedValue] = useState(tabs[0].value);

  const handleChange = useCallback((value: string) => {
    setSelectedValue(value);
  }, []);

  async function handleCanDelete(label: string): Promise<boolean> {
    void label;
    // return confirm(`Delete "${label}"?`);

    // Before we delete, change the selected value to the next value
    const index = tabs.findIndex((t) => t.value === selectedValue);
    let next = tabs[index + 1];
    if (!next) next = tabs[index - 1];

    if (next) {
      setSelectedValue(next.value);
    }

    return true;
  }

  const { parentRef } = useChildAnimator<HTMLDivElement>("both");

  return (
    <div className="RadioTabGroup flex" ref={parentRef}>
      {tabs.map((t) => (
        <RadioTab
          key={t.value}
          value={t.value}
          label={t.label}
          radioName={name}
          color={t.color}
          checked={selectedValue === t.value}
          onCheck={handleChange}
          canDelete={tabs.length > 1 ? handleCanDelete : undefined}
          onDelete={onDelete}
        />
      ))}
      <button className="round-btn" onClick={onNew}>
        <Plus />
      </button>
    </div>
  );
}
