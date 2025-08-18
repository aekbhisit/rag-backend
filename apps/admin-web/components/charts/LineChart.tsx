import React from "react";

type DataPoint = {
  label: string;
  value: number;
};

type LineChartProps = {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  showGrid?: boolean;
};

export function LineChart({ 
  data, 
  width = 400, 
  height = 200, 
  color = "#4F46E5",
  showDots = true,
  showGrid = true
}: LineChartProps) {
  const safeData = Array.isArray(data) ? data.filter(d => Number.isFinite(Number(d?.value))) : [];
  if (safeData.length === 0) return null;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const maxValue = Math.max(...safeData.map(d => Number(d.value)));
  const minValue = Math.min(...safeData.map(d => Number(d.value)));
  const valueRange = Math.max(1, maxValue - minValue);
  const denomIndex = Math.max(1, safeData.length - 1);
  
  const points = safeData.map((d, i) => {
    const x = padding + (i / denomIndex) * chartWidth;
    const y = padding + chartHeight - (((Number(d.value) - minValue) / valueRange) * chartHeight);
    return { x, y, value: Number(d.value), label: d.label };
  });
  
  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ');

  return (
    <div className="relative">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
                stroke="currentColor"
                strokeWidth="1"
                className="text-[color:var(--text-muted)]"
              />
            ))}
          </g>
        )}
        
        {/* Area fill */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        <path
          d={`${pathData} L ${points[points.length - 1].x},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`}
          fill={`url(#gradient-${color})`}
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Dots */}
        {showDots && points.map((point, i) => (
          <circle
            key={`dot:${i}:${point.label}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
            className="hover:r-6 transition-all cursor-pointer"
          >
            <title>{`${point.label}: ${point.value}`}</title>
          </circle>
        ))}
        
        {/* Y-axis labels */}
        <g className="text-xs text-[color:var(--text-muted)]">
          {[0, 0.5, 1].map((ratio) => {
            const value = minValue + (maxValue - minValue) * (1 - ratio);
            return (
              <text
                key={ratio}
                x={padding - 8}
                y={padding + chartHeight * ratio + 4}
                textAnchor="end"
                className="fill-current"
              >
                {value.toFixed(value < 1 ? 3 : 1)}
              </text>
            );
          })}
        </g>
        
        {/* X-axis labels */}
        <g className="text-xs text-[color:var(--text-muted)]">
          {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((point, i) => (
            <text
              key={`xlabel:${i}:${point.label}`}
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-current"
            >
              {point.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
