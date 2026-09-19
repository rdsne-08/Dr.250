const helixPoints = Array.from({ length: 13 }, (_, index) => {
  const y = 30 + index * 42;
  const phase = index * 0.82;
  const leftX = 76 + Math.sin(phase) * 40;
  const rightX = 76 - Math.sin(phase) * 40;

  return { leftX, rightX, y, delay: `${index * -0.32}s` };
});

const strandA = helixPoints.map(({ leftX, y }) => `${leftX},${y}`).join(' ');
const strandB = helixPoints.map(({ rightX, y }) => `${rightX},${y}`).join(' ');

export function DNAAnimation({ className = '' }) {
  return (
    <div className={`dna-scene pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="dna-glow dna-glow-one" />
      <div className="dna-glow dna-glow-two" />
      <svg
        className="dna-helix"
        viewBox="0 0 152 565"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="strand-green" x1="20" y1="0" x2="136" y2="565">
            <stop stopColor="#7DD9B9" />
            <stop offset="1" stopColor="#168867" />
          </linearGradient>
          <linearGradient id="strand-teal" x1="132" y1="0" x2="28" y2="565">
            <stop stopColor="#AFECE7" />
            <stop offset="1" stopColor="#29AAA4" />
          </linearGradient>
        </defs>

        <g className="dna-core">
          <polyline
            points={strandA}
            stroke="url(#strand-green)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={strandB}
            stroke="url(#strand-teal)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {helixPoints.map(({ delay, leftX, rightX, y }, index) => {
            const front = index % 4 < 2;

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
                  stroke={front ? '#46C39A' : '#AFECE7'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx={leftX} cy={y} r="5" fill={front ? '#20A97F' : '#B1EAD4'} />
                <circle cx={rightX} cy={y} r="5" fill={front ? '#29AAA4' : '#D5F6F3'} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
