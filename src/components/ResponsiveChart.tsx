import React, { useRef, useState, useEffect, useMemo } from 'react';

export interface ChartDataPoint {
  date: string;
  label: string;
  primaryValue: number; // e.g. Выручка или Предельная цена
  secondaryValue?: number; // e.g. Чистая прибыль или Цена реализации
  extraLabel?: string;
  metadata?: Record<string, unknown>;
}

interface ResponsiveChartProps {
  data: ChartDataPoint[];
  height?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string; // e.g. '#3b82f6'
  secondaryColor?: string; // e.g. '#10b981'
  type?: 'line' | 'bar' | 'area';
  valuePrefix?: string;
  valueSuffix?: string;
  emptyMessage?: string;
}

export const ResponsiveChart: React.FC<ResponsiveChartProps> = ({
  data,
  height = 220,
  primaryLabel = 'Выручка',
  secondaryLabel = 'Чистая прибыль',
  primaryColor = '#3b82f6',
  secondaryColor = '#10b981',
  type = 'line',
  valuePrefix = '',
  valueSuffix = ' ₽',
  emptyMessage = 'Нет данных для отображения за выбранный период',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ResizeObserver for reliable width determination
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(Math.floor(rect.width));
      }
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(el);
    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Safe bounds calculation
  const { minVal, maxVal, hasSecondary } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minVal: 0, maxVal: 100, hasSecondary: false };
    }

    let min = Infinity;
    let max = -Infinity;
    let hasSec = false;

    data.forEach((d) => {
      if (d.primaryValue !== undefined && !isNaN(d.primaryValue)) {
        if (d.primaryValue < min) min = d.primaryValue;
        if (d.primaryValue > max) max = d.primaryValue;
      }
      if (d.secondaryValue !== undefined && !isNaN(d.secondaryValue)) {
        hasSec = true;
        if (d.secondaryValue < min) min = d.secondaryValue;
        if (d.secondaryValue > max) max = d.secondaryValue;
      }
    });

    if (min === Infinity || max === -Infinity) {
      return { minVal: 0, maxVal: 100, hasSecondary: false };
    }

    // Always include 0 if minimum is positive, or pad nicely
    const safeMin = min < 0 ? min * 1.15 : 0;
    const safeMax = max === safeMin ? safeMin + 100 : max * 1.12;

    return { minVal: safeMin, maxVal: safeMax, hasSecondary: hasSec };
  }, [data]);

  const range = maxVal - minVal || 1;

  // Chart margins
  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 32;

  const chartWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const chartHeight = Math.max(80, height - paddingTop - paddingBottom);

  // Scaled coordinates
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = data.length;

    return data.map((d, i) => {
      const x =
        count === 1
          ? paddingLeft + chartWidth / 2
          : paddingLeft + (i / (count - 1)) * chartWidth;

      const normYPrimary = (d.primaryValue - minVal) / range;
      const yPrimary = paddingTop + chartHeight - normYPrimary * chartHeight;

      let ySecondary: number | undefined = undefined;
      if (d.secondaryValue !== undefined) {
        const normYSec = (d.secondaryValue - minVal) / range;
        ySecondary = paddingTop + chartHeight - normYSec * chartHeight;
      }

      return {
        x,
        yPrimary,
        ySecondary,
        d,
        index: i,
      };
    });
  }, [data, minVal, range, chartWidth, chartHeight, paddingLeft, paddingTop]);

  // SVG paths
  const paths = useMemo(() => {
    if (points.length < 2) return { primaryPath: '', primaryArea: '', secondaryPath: '' };

    const primaryD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yPrimary.toFixed(1)}`)
      .join(' ');

    const zeroY = paddingTop + chartHeight - ((0 - minVal) / range) * chartHeight;
    const boundedZeroY = Math.max(paddingTop, Math.min(paddingTop + chartHeight, zeroY));

    const primaryAreaD = `${primaryD} L ${points[points.length - 1].x.toFixed(1)} ${boundedZeroY.toFixed(
      1
    )} L ${points[0].x.toFixed(1)} ${boundedZeroY.toFixed(1)} Z`;

    let secondaryD = '';
    if (hasSecondary) {
      secondaryD = points
        .filter((p) => p.ySecondary !== undefined)
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.ySecondary!.toFixed(1)}`)
        .join(' ');
    }

    return { primaryPath: primaryD, primaryArea: primaryAreaD, secondaryPath: secondaryD };
  }, [points, minVal, range, paddingTop, chartHeight, hasSecondary]);

  // Y-axis tick values (3-4 nice values)
  const yTicks = useMemo(() => {
    const ticksCount = 4;
    const res: { val: number; y: number }[] = [];
    for (let i = 0; i < ticksCount; i++) {
      const val = minVal + (range / (ticksCount - 1)) * i;
      const y = paddingTop + chartHeight - (i / (ticksCount - 1)) * chartHeight;
      res.push({ val: Math.round(val), y });
    }
    return res;
  }, [minVal, range, chartHeight, paddingTop]);

  // X-axis label interval
  const xTickIndices = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = data.length;
    if (count <= 7) return data.map((_, i) => i);

    // Target ~6-8 ticks
    const targetTicks = Math.min(count, Math.max(4, Math.floor(containerWidth / 90)));
    const step = Math.ceil(count / targetTicks);
    const indices: number[] = [];
    for (let i = 0; i < count; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== count - 1) {
      indices.push(count - 1);
    }
    return indices;
  }, [data, containerWidth]);

  // Interactive mouse handling
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points || points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;

    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Clamped tooltip position so it NEVER overflows the container left or right
  const hoveredPoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  const tooltipWidth = 195;
  let clampedTooltipX = 0;
  if (hoveredPoint) {
    clampedTooltipX = hoveredPoint.x - tooltipWidth / 2;
    if (clampedTooltipX < 10) clampedTooltipX = 10;
    if (clampedTooltipX + tooltipWidth > containerWidth - 10) {
      clampedTooltipX = containerWidth - tooltipWidth - 10;
    }
  }

  if (!data || data.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full min-w-0 max-w-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-mono"
      >
        {emptyMessage}
      </div>
    );
  }

  const gradId = `chart_grad_${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 max-w-full overflow-hidden relative select-none font-sans"
      style={{ height }}
    >
      <svg
        width={containerWidth}
        height={height}
        className="w-full h-full block cursor-crosshair overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={primaryColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={containerWidth - paddingRight}
              y2={tick.y}
              stroke="currentColor"
              className="text-slate-200 dark:text-white/[0.06]"
              strokeDasharray={i === 0 ? undefined : '3 3'}
              strokeWidth={1}
            />
            <text
              x={paddingLeft - 8}
              y={tick.y + 3.5}
              textAnchor="end"
              className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
            >
              {tick.val >= 1000000
                ? `${(tick.val / 1000000).toFixed(1)}M`
                : tick.val >= 1000
                ? `${(tick.val / 1000).toFixed(0)}k`
                : tick.val}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {type === 'line' && paths.primaryArea && (
          <path d={paths.primaryArea} fill={`url(#${gradId})`} />
        )}

        {/* Bars rendering if type === 'bar' */}
        {type === 'bar' &&
          points.map((p, idx) => {
            const barWidth = Math.max(2, Math.min(24, (chartWidth / points.length) * 0.7));
            const barX = p.x - barWidth / 2;
            const barH = Math.max(2, paddingTop + chartHeight - p.yPrimary);
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx}>
                <rect
                  x={barX}
                  y={p.yPrimary}
                  width={barWidth}
                  height={barH}
                  rx={2}
                  fill={isHovered ? primaryColor : `${primaryColor}cc`}
                  className="transition-all"
                />
              </g>
            );
          })}

        {/* Secondary line (e.g. Net Profit) */}
        {type === 'line' && hasSecondary && paths.secondaryPath && (
          <path
            d={paths.secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Primary line (e.g. Revenue) */}
        {type === 'line' && paths.primaryPath && (
          <path
            d={paths.primaryPath}
            fill="none"
            stroke={primaryColor}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover vertical guide line */}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={paddingTop}
            x2={hoveredPoint.x}
            y2={paddingTop + chartHeight}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-400"
            strokeDasharray="2 2"
            strokeWidth={1}
          />
        )}

        {/* Hover dot for primary value */}
        {hoveredPoint && (
          <circle
            cx={hoveredPoint.x}
            cy={hoveredPoint.yPrimary}
            r={5}
            fill={primaryColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="shadow-md"
          />
        )}

        {/* Hover dot for secondary value */}
        {hoveredPoint && hoveredPoint.ySecondary !== undefined && (
          <circle
            cx={hoveredPoint.x}
            cy={hoveredPoint.ySecondary}
            r={4.5}
            fill={secondaryColor}
            stroke="#ffffff"
            strokeWidth={2}
            className="shadow-md"
          />
        )}

        {/* X-axis tick labels */}
        {xTickIndices.map((idx) => {
          const pt = points[idx];
          if (!pt) return null;
          return (
            <text
              key={idx}
              x={pt.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
            >
              {pt.d.label}
            </text>
          );
        })}
      </svg>

      {/* Clamped Interactive Tooltip - Completely immune to screen overflow */}
      {hoveredPoint && (
        <div
          style={{
            left: `${clampedTooltipX}px`,
            top: '8px',
            width: `${tooltipWidth}px`,
          }}
          className="pointer-events-none absolute z-30 p-2.5 rounded-lg bg-slate-900/95 dark:bg-[#141c2e]/95 text-white border border-slate-700/80 dark:border-white/15 shadow-xl backdrop-blur-md transition-all text-xs"
        >
          <div className="font-mono text-[11px] font-semibold text-slate-300 border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between">
            <span>{hoveredPoint.d.date}</span>
            {hoveredPoint.d.extraLabel && (
              <span className="text-[10px] text-slate-400">{hoveredPoint.d.extraLabel}</span>
            )}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span>{primaryLabel}:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {valuePrefix}
                {hoveredPoint.d.primaryValue.toLocaleString('ru-RU')}
                {valueSuffix}
              </span>
            </div>

            {hoveredPoint.d.secondaryValue !== undefined && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                  <span>{secondaryLabel}:</span>
                </span>
                <span
                  className="font-mono font-bold"
                  style={{ color: secondaryColor }}
                >
                  {valuePrefix}
                  {hoveredPoint.d.secondaryValue.toLocaleString('ru-RU')}
                  {valueSuffix}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
