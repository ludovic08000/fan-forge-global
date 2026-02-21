import React, { useRef, useCallback, useState } from 'react';

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  size?: number;
  label: string;
  icon: React.ReactNode;
  color?: string;
}

const RotaryKnob: React.FC<RotaryKnobProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  size = 72,
  label,
  icon,
  color = 'hsl(var(--primary))',
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  // Map value to angle: -135° to 135° (270° range)
  const range = max - min;
  const normalized = (value - min) / range;
  const angle = -135 + normalized * 270;

  // SVG arc for the track
  const radius = (size - 12) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const polarToCartesian = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startY.current = e.clientY;
      startValue.current = value;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [value]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dy = startY.current - e.clientY;
      const sensitivity = range / 150;
      let newVal = startValue.current + dy * sensitivity;
      // Snap to step
      newVal = Math.round(newVal / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    },
    [isDragging, min, max, range, step, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Display value
  const displayVal = step < 1 ? value.toFixed(1) : Math.round(value).toString();

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div
        ref={knobRef}
        className={`relative cursor-grab active:cursor-grabbing transition-transform duration-150 ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* SVG Track + Active arc */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0"
          style={{ filter: isDragging ? `drop-shadow(0 0 8px ${color})` : 'none', transition: 'filter 0.3s' }}
        >
          {/* Background track */}
          <path
            d={describeArc(-135, 135)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Active arc */}
          {normalized > 0.005 && (
            <path
              d={describeArc(-135, -135 + normalized * 270)}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 4px ${color})`,
              }}
            />
          )}
        </svg>

        {/* Knob body */}
        <div
          className="absolute rounded-full border border-white/[0.12] bg-gradient-to-b from-white/[0.12] to-white/[0.04] backdrop-blur-sm flex items-center justify-center"
          style={{
            width: size - 20,
            height: size - 20,
            top: 10,
            left: 10,
            transform: `rotate(${angle}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.4), ${isDragging ? `0 0 20px ${color}40` : '0 0 0 transparent'}`,
          }}
        >
          {/* Indicator notch */}
          <div
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              top: 6,
              left: '50%',
              marginLeft: -2,
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        </div>

        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-[10px] font-bold text-white/80 tabular-nums"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
          >
            {displayVal}
          </span>
        </div>
      </div>

      {/* Icon + Label */}
      <div className="flex items-center gap-1.5">
        <span className="opacity-70">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
      </div>
    </div>
  );
};

export default RotaryKnob;
