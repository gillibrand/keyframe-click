import { memo, useMemo } from "react";
import "./ProgressBar.css";

interface Props {
  value: number;
  style?: React.CSSProperties;
}

export const ProgressBar = memo(function ProgressBar({ value, style }: Props) {
  const allStyle = useMemo(() => {
    return { ...style, "--percent": Math.max(0, Math.min(value / 100, 100)) };
  }, [value, style]);

  return (
    <div className="ProgressBar" style={allStyle} role="progressbar" aria-valuenow={value}>
      <div className="ProgressBar__bar"></div>
    </div>
  );
});
