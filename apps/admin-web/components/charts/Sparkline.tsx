import React from "react";

type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

export function Sparkline({
  data,
  width = 240,
  height = 60,
  stroke = "#4F46E5",
  strokeWidth = 2,
  fill = "none",
}: SparklineProps) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 8) + 4;
    const y = height - 4 - ((d - min) / range) * (height - 8);
    return `${x},${y}`;
  });
  const d = `M ${points[0]} L ${points.slice(1).join(" ")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round" />
    </svg>
  );
}
