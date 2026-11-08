type AnswerSheetArtProps = {
  className?: string;
  tone?: "light" | "dark";
};

/** Full-bleed exam-paper visual: numbered rows, option bubbles, highlighter marks. */
export function AnswerSheetArt({
  className = "",
  tone = "light",
}: AnswerSheetArtProps) {
  const ink = tone === "dark" ? "#9fb3c8" : "#1c3148";
  const faint = tone === "dark" ? "#243b53" : "#c5d2e0";
  const paper = tone === "dark" ? "#102a43" : "#f7fafc";
  const mark = "#f0b429";

  return (
    <svg
      className={className}
      viewBox="0 0 900 1200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="900" height="1200" fill={paper} />

      {/* Ruled lines */}
      {Array.from({ length: 22 }, (_, i) => {
        const y = 140 + i * 44;
        return (
          <line
            key={`rule-${i}`}
            x1="72"
            y1={y}
            x2="828"
            y2={y}
            stroke={faint}
            strokeWidth="1.5"
          />
        );
      })}

      {/* Left margin bar */}
      <rect x="48" y="96" width="8" height="1008" fill={mark} opacity="0.85" />

      {/* Header band */}
      <rect x="72" y="72" width="756" height="42" fill={faint} opacity="0.35" />
      <text
        x="88"
        y="100"
        fill={ink}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="18"
        fontWeight="600"
        letterSpacing="2"
      >
        QUESTION PAPER · SET A
      </text>

      {/* Numbered rows + bubbles */}
      {[
        [1, 0],
        [2, 1],
        [3, 2],
        [4, 0],
        [5, 3],
        [6, 1],
        [7, 2],
        [8, 0],
        [9, 1],
        [10, 3],
        [11, 2],
        [12, 0],
        [13, 1],
        [14, 3],
        [15, 2],
      ].map(([n, filled], index) => {
        const y = 168 + index * 56;
        return (
          <g key={`row-${n}`}>
            <text
              x="88"
              y={y + 8}
              fill={ink}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="22"
              fontWeight="700"
            >
              {String(n).padStart(2, "0")}
            </text>
            {[0, 1, 2, 3].map((opt) => {
              const cx = 220 + opt * 72;
              const isFilled = opt === filled;
              return (
                <g key={`b-${n}-${opt}`}>
                  <circle
                    cx={cx}
                    cy={y}
                    r="16"
                    stroke={ink}
                    strokeWidth="2"
                    fill={isFilled ? ink : "transparent"}
                    opacity={isFilled ? 0.9 : 0.55}
                  />
                  <text
                    x={cx}
                    y={y + 5}
                    textAnchor="middle"
                    fill={isFilled ? paper : ink}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {String.fromCharCode(65 + opt)}
                  </text>
                </g>
              );
            })}
            <line
              x1="520"
              y1={y}
              x2="800"
              y2={y}
              stroke={faint}
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.45"
            />
          </g>
        );
      })}

      {/* Highlighter streak */}
      <path
        className="ef-pulse-mark"
        d="M560 240 C620 220, 700 250, 760 210"
        stroke={mark}
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M140 980 C260 940, 400 1020, 560 960"
        stroke={mark}
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Corner crop marks */}
      <path d="M24 24 H72 M24 24 V72" stroke={ink} strokeWidth="3" />
      <path d="M876 24 H828 M876 24 V72" stroke={ink} strokeWidth="3" />
      <path d="M24 1176 H72 M24 1176 V1128" stroke={ink} strokeWidth="3" />
      <path d="M876 1176 H828 M876 1176 V1128" stroke={ink} strokeWidth="3" />
    </svg>
  );
}
