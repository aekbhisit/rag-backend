import React from "react";

type BarChartProps = {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
};

export function BarChart({ data, labels = [], width = 360, height = 120, color = "#10B981" }: BarChartProps) {
  const max = Math.max(1, ...data);
  const barWidth = (width - 16) / data.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {data.map((v, i) => {
        const x = 8 + i * barWidth;
        const h = (v / max) * (height - 20);
        const y = height - 10 - h;
        return <rect key={i} x={x + 2} y={y} width={barWidth - 4} height={h} rx={4} fill={color} />;
      })}
    </svg>
  );
}
