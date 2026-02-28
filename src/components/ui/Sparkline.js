const COLORS = {
  up: '#059669',
  down: '#DC2626',
  flat: '#94A3B8',
};

export default function Sparkline({ data, width = 96, height = 32, className }) {
  // When className is provided, let CSS control size (for responsive/full-width usage)
  const sizeProps = className ? {} : { width, height };

  // No data or insufficient points — show dashed placeholder
  if (!data || data.length < 2) {
    const midY = height / 2;
    return (
      <svg
        {...sizeProps}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio={className ? 'none' : undefined}
        aria-hidden="true"
        className={className || 'inline-block'}
      >
        <line
          x1={4}
          y1={midY}
          x2={width - 4}
          y2={midY}
          stroke={COLORS.flat}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      </svg>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const color = last > first ? COLORS.up : last < first ? COLORS.down : COLORS.flat;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padX = 4;
  const padY = 4;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data
    .map((val, i) => {
      const x = padX + (i / (data.length - 1)) * innerW;
      const y = padY + innerH - ((val - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      {...sizeProps}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={className ? 'none' : undefined}
      aria-hidden="true"
      className={className || 'inline-block'}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
