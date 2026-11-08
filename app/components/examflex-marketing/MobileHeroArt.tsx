/** Compact landscape exam-paper card sized for mobile/tablet hero bands. */
export function MobileHeroArt({ className = "" }: { className?: string }) {
  const ink = "#0a1628";
  const soft = "#486581";
  const line = "#c5d2e0";
  const paper = "#f7fafc";
  const mark = "#f0b429";

  const rows: Array<[number, number]> = [
    [1, 0],
    [2, 1],
    [3, 2],
    [4, 0],
    [5, 3],
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 560 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Soft ambient glow — stays inside the frame */}
      <ellipse cx="280" cy="125" rx="230" ry="100" fill="#1c3148" opacity="0.45" />

      {/* Paper card — centered with margin so tilt never clips */}
      <g transform="translate(88 22) rotate(-1.5 192 100)">
        <rect x="4" y="6" width="376" height="200" rx="10" fill="#0a1628" opacity="0.25" />
        <rect x="0" y="0" width="376" height="200" rx="10" fill={paper} />
        <rect x="14" y="14" width="5" height="172" rx="2" fill={mark} />

        <text
          x="32"
          y="36"
          fill={soft}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.4"
        >
          QUESTION PAPER · SET A
        </text>
        <line x1="32" y1="46" x2="352" y2="46" stroke={line} strokeWidth="1.5" />

        {rows.map(([n, filled], index) => {
          const y = 70 + index * 24;
          return (
            <g key={n}>
              <text
                x="34"
                y={y + 4}
                fill={ink}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="12"
                fontWeight="700"
              >
                {String(n).padStart(2, "0")}
              </text>
              {[0, 1, 2, 3].map((opt) => {
                const cx = 82 + opt * 32;
                const isFilled = opt === filled;
                return (
                  <g key={opt}>
                    <circle
                      cx={cx}
                      cy={y}
                      r="9"
                      stroke={ink}
                      strokeWidth="1.6"
                      fill={isFilled ? ink : "transparent"}
                    />
                    <text
                      x={cx}
                      y={y + 3.5}
                      textAnchor="middle"
                      fill={isFilled ? paper : ink}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontSize="8"
                      fontWeight="700"
                    >
                      {String.fromCharCode(65 + opt)}
                    </text>
                  </g>
                );
              })}
              <line
                x1="230"
                y1={y}
                x2="352"
                y2={y}
                stroke={line}
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.75"
              />
            </g>
          );
        })}

        <path
          d="M248 76 C276 68, 300 82, 328 70"
          stroke={mark}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}
