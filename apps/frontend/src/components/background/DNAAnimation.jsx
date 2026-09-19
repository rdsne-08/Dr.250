import { useId } from 'react';

const helixPoints = Array.from({ length: 19 }, (_, index) => {
  const y = 26 + index * 32;
  const phase = index * 0.76;
  const depth = Math.cos(phase);
  const leftX = 100 + Math.sin(phase) * 64;
  const rightX = 100 - Math.sin(phase) * 64;

  return {
    depth,
    leftX,
    rightX,
    y,
    delay: `${index * -0.38}s`,
  };
});

function smoothPath(points) {
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const controlOneX = point.x + (next.x - previous.x) / 6;
    const controlOneY = point.y + (next.y - previous.y) / 6;
    const controlTwoX = next.x - (following.x - point.x) / 6;
    const controlTwoY = next.y - (following.y - point.y) / 6;

    return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${next.x} ${next.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

const strandA = smoothPath(helixPoints.map(({ leftX: x, y }) => ({ x, y })));
const strandB = smoothPath(helixPoints.map(({ rightX: x, y }) => ({ x, y })));

const particles = [
  { cx: 22, cy: 102, radius: 2.7 },
  { cx: 178, cy: 194, radius: 2.1 },
  { cx: 18, cy: 418, radius: 2 },
  { cx: 182, cy: 534, radius: 2.5 },
  { cx: 30, cy: 596, radius: 1.8 },
];

export function DNAAnimation({ className = '' }) {
  const gradientId = useId().replaceAll(':', '');
  const greenGradientId = `${gradientId}-green`;
  const tealGradientId = `${gradientId}-teal`;

  return (
    <div className={`dna-scene pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="dna-glow dna-glow-one" />
      <div className="dna-glow dna-glow-two" />
      <svg
        className="dna-helix"
        viewBox="0 0 200 630"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={greenGradientId} x1="22" y1="18" x2="178" y2="612">
            <stop stopColor="#7DD9B9" />
            <stop offset="0.52" stopColor="#46C39A" />
            <stop offset="1" stopColor="#168867" />
          </linearGradient>
          <linearGradient id={tealGradientId} x1="178" y1="18" x2="22" y2="612">
            <stop stopColor="#AFECE7" />
            <stop offset="0.52" stopColor="#7BDCD5" />
            <stop offset="1" stopColor="#208985" />
          </linearGradient>
        </defs>

        <g className="dna-particles">
          {particles.map(({ cx, cy, radius }, index) => (
            <circle
              key={`${cx}-${cy}`}
              className={`dna-particle dna-particle-${index + 1}`}
              cx={cx}
              cy={cy}
              r={radius}
              fill={index % 2 === 0 ? '#7DD9B9' : '#7BDCD5'}
            />
          ))}
        </g>

        <g className="dna-core">
          <line className="dna-axis" x1="100" y1="12" x2="100" y2="618" />
          <path className="dna-strand-halo" d={strandA} />
          <path className="dna-strand-halo" d={strandB} />
          <path
            className="dna-strand"
            d={strandA}
            stroke={`url(#${greenGradientId})`}
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="dna-strand"
            d={strandB}
            stroke={`url(#${tealGradientId})`}
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {helixPoints.map(({ delay, depth, leftX, rightX, y }) => {
            const front = depth >= 0;
            const nodeRadius = front ? 6 : 4.4;

            return (
              <g
                key={y}
                className={front ? 'dna-rung dna-rung-front' : 'dna-rung dna-rung-back'}
                style={{ animationDelay: delay }}
              >
                <line
                  x1={leftX}
                  y1={y}
                  x2={rightX}
                  y2={y}
                  stroke={front ? '#46C39A' : '#B1EAD4'}
                  strokeWidth={front ? 2.8 : 1.8}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={leftX}
                  cy={y}
                  r={nodeRadius}
                  fill={front ? '#20A97F' : '#D7F5E8'}
                />
                <circle
                  cx={rightX}
                  cy={y}
                  r={nodeRadius}
                  fill={front ? '#29AAA4' : '#D5F6F3'}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
