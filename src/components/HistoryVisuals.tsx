import type { HistoricalFigureDef } from "../types";

/**
 * Original local SVG vintage scientific instrument & scene banners for the 5 playable History chapters.
 * Zero external URLs; uses the copper-gold / warm parchment / deep-blue laboratory palette.
 */
export function HistoryChapterScene({ chapterId }: { chapterId: string }) {
  return (
    <div className="history-scene-banner">
      <svg
        viewBox="0 0 640 168"
        className="history-scene-svg"
        role="img"
        aria-label={`历史实验场景插画 ${chapterId}`}
      >
        <defs>
          <linearGradient id={`hbg-${chapterId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1b191d" />
            <stop offset="55%" stopColor="#26201c" />
            <stop offset="100%" stopColor="#141e2b" />
          </linearGradient>
          <linearGradient id="copperGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f0c38e" />
            <stop offset="100%" stopColor="#b8733d" />
          </linearGradient>
        </defs>
        <rect
          width="640"
          height="168"
          rx="14"
          fill={`url(#hbg-${chapterId})`}
          stroke="#c9935b"
          strokeOpacity="0.35"
        />
        {/* Manuscript horizontal ruled lines */}
        <g stroke="#e6c499" strokeOpacity="0.08" strokeWidth="1">
          {[32, 56, 80, 104, 128].map((y) => (
            <line key={y} x1="22" y1={y} x2="618" y2={y} />
          ))}
        </g>

        {chapterId === "hist_01" ? (
          /* Pneumatic trough, bell jars & sun focusing lens */
          <g>
            <circle
              cx="112"
              cy="64"
              r="32"
              fill="none"
              stroke="url(#copperGrad)"
              strokeWidth="2.4"
            />
            <line
              x1="140"
              y1="82"
              x2="232"
              y2="112"
              stroke="#f4d58d"
              strokeWidth="1.8"
              strokeDasharray="5 4"
            />
            <rect
              x="220"
              y="108"
              width="220"
              height="34"
              rx="6"
              fill="#132c3d"
              stroke="#85c4e0"
              strokeOpacity="0.5"
            />
            {[260, 326, 392].map((x, idx) => (
              <g key={x} transform={`translate(${x}, 36)`}>
                <path
                  d="M-20,76 L-20,18 Q-20,0 0,0 Q20,0 20,18 L20,76 Z"
                  fill={
                    idx === 1
                      ? "rgba(244,213,141,0.16)"
                      : "rgba(131,205,233,0.1)"
                  }
                  stroke={idx === 1 ? "#f0c38e" : "#9dc7de"}
                  strokeWidth="1.8"
                />
                <text
                  x="0"
                  y="48"
                  textAnchor="middle"
                  fill="#ecd7b8"
                  fontSize="11"
                  fontWeight="700"
                >
                  {["甲", "乙", "丙"][idx]}
                </text>
              </g>
            ))}
            <text x="478" y="64" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1774
            </text>
            <text x="478" y="84" fill="#c7b299" fontSize="10">
              集气槽 · 燃烧检验台
            </text>
          </g>
        ) : chapterId === "hist_02" ? (
          /* Precision equal-arm analytical balance in glass case */
          <g>
            <rect
              x="140"
              y="22"
              width="250"
              height="126"
              rx="8"
              fill="rgba(230,196,153,0.05)"
              stroke="#c9935b"
              strokeOpacity="0.45"
            />
            <line
              x1="265"
              y1="42"
              x2="265"
              y2="132"
              stroke="#dfaa70"
              strokeWidth="3"
            />
            <line
              x1="185"
              y1="56"
              x2="345"
              y2="56"
              stroke="#e8ba83"
              strokeWidth="2.8"
            />
            <path
              d="M185,56 L168,100 L202,100 Z"
              fill="none"
              stroke="#e4b782"
              strokeWidth="1.6"
            />
            <path
              d="M345,56 L328,100 L362,100 Z"
              fill="none"
              stroke="#e4b782"
              strokeWidth="1.6"
            />
            <rect x="225" y="132" width="80" height="8" rx="3" fill="#b8733d" />
            <circle cx="265" cy="56" r="5" fill="#f0c38e" />
            <text x="424" y="64" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1789
            </text>
            <text x="424" y="86" fill="#c7b299" fontSize="10">
              精密等臂天平 · 开放/密闭对照
            </text>
          </g>
        ) : chapterId === "hist_03" ? (
          /* Glass synthesis globe with dual gas inlets & spark gap */
          <g>
            <circle
              cx="275"
              cy="84"
              r="52"
              fill="rgba(104,186,230,0.12)"
              stroke="#9fd3eb"
              strokeWidth="2"
            />
            <line
              x1="125"
              y1="68"
              x2="225"
              y2="76"
              stroke="#85d1f5"
              strokeWidth="2.4"
            />
            <line
              x1="125"
              y1="104"
              x2="225"
              y2="94"
              stroke="#f0c38e"
              strokeWidth="2.4"
            />
            <path
              d="M262,64 L278,84 L268,84 L284,104"
              fill="none"
              stroke="#ffd87a"
              strokeWidth="2.2"
            />
            <path
              d="M238,112 Q275,128 312,112 Q295,134 275,135 Q255,134 238,112 Z"
              fill="#5ebae6"
              opacity="0.65"
            />
            <text x="90" y="72" fill="#9fd9f7" fontSize="11">
              H₂
            </text>
            <text x="90" y="108" fill="#f0c38e" fontSize="11">
              O₂
            </text>
            <text x="368" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1780s
            </text>
            <text x="368" y="88" fill="#c7b299" fontSize="10">
              电火花合成球泡 · 双向验证台
            </text>
          </g>
        ) : chapterId === "hist_04" ? (
          /* Voltaic pile wooden rods + stacked discs + vintage galvanometer */
          <g>
            <line
              x1="210"
              y1="26"
              x2="210"
              y2="142"
              stroke="#b8733d"
              strokeWidth="4"
            />
            <line
              x1="310"
              y1="26"
              x2="310"
              y2="142"
              stroke="#b8733d"
              strokeWidth="4"
            />
            <rect
              x="195"
              y="138"
              width="130"
              height="10"
              rx="3"
              fill="#8f5830"
            />
            {[0, 1, 2].map((cell) => {
              const base = 124 - cell * 34;
              return (
                <g key={cell}>
                  <rect
                    x="218"
                    y={base}
                    width="84"
                    height="9"
                    rx="3"
                    fill="#95abc2"
                  />
                  <rect
                    x="218"
                    y={base - 10}
                    width="84"
                    height="8"
                    rx="3"
                    fill="#4fa6db"
                  />
                  <rect
                    x="218"
                    y={base - 21}
                    width="84"
                    height="9"
                    rx="3"
                    fill="#d9874f"
                  />
                </g>
              );
            })}
            <circle
              cx="430"
              cy="84"
              r="38"
              fill="#131e2c"
              stroke="url(#copperGrad)"
              strokeWidth="2.4"
            />
            <line
              x1="430"
              y1="84"
              x2="452"
              y2="62"
              stroke="#f7d469"
              strokeWidth="2.4"
            />
            <circle cx="430" cy="84" r="4" fill="#f7d469" />
            <text x="488" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1800
            </text>
            <text x="488" y="88" fill="#c7b299" fontSize="10">
              伏打电堆 · 叠层电流台
            </text>
          </g>
        ) : chapterId === "hist_05" ? (
          /* 1828 Wöhler evaporating dish & needle urea crystals */
          <g>
            <ellipse
              cx="235"
              cy="118"
              rx="86"
              ry="18"
              fill="rgba(126,224,192,0.12)"
              stroke="#7ee0c0"
              strokeWidth="2"
            />
            <path
              d="M150,114 Q235,148 320,114"
              fill="none"
              stroke="url(#copperGrad)"
              strokeWidth="2.4"
            />
            {[188, 212, 236, 260, 282].map((x, idx) => (
              <line
                key={x}
                x1={x}
                y1={116}
                x2={x + (idx % 2 === 0 ? -10 : 12)}
                y2={72 + (idx % 3) * 8}
                stroke="#bdf5e3"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))}
            <text x="382" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1828
            </text>
            <text x="382" y="88" fill="#c7b299" fontSize="10">
              蒸发皿针状结晶 · 同分异构对照
            </text>
          </g>
        ) : chapterId === "hist_06" ? (
          /* 1830s Faraday voltameter dual-tube electrolysis & ammeter */
          <g>
            {[170, 285].map((x, idx) => (
              <g key={x}>
                <rect
                  x={x}
                  y="38"
                  width="76"
                  height="92"
                  rx="8"
                  fill="rgba(111,211,232,0.12)"
                  stroke="#6fd3e8"
                  strokeWidth="1.8"
                />
                <rect x={x + 14} y="56" width="8" height="58" fill="#d9874f" />
                <rect x={x + 54} y="56" width="8" height="58" fill="#9fb3c8" />
                <text
                  x={x + 38}
                  y="146"
                  textAnchor="middle"
                  fill="#b8d9ea"
                  fontSize="10"
                >
                  {idx === 0 ? "Ag⁺ (1e⁻)" : "Cu²⁺ (2e⁻)"}
                </text>
              </g>
            ))}
            <line
              x1="246"
              y1="56"
              x2="285"
              y2="56"
              stroke="#f0c38e"
              strokeWidth="2"
            />
            <text x="404" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1830s
            </text>
            <text x="404" y="88" fill="#c7b299" fontSize="10">
              串联电解槽 · 定量电量计
            </text>
          </g>
        ) : chapterId === "hist_08" ? (
          /* 1898 Piezo-quartz electroscope & ionization signal trace */
          <g>
            <rect
              x="128"
              y="36"
              width="220"
              height="96"
              rx="8"
              fill="#111d29"
              stroke="#c9935b"
              strokeOpacity="0.55"
            />
            <rect
              x="148"
              y="106"
              width="26"
              height="16"
              rx="2"
              fill="#6d90a8"
            />
            <rect x="192" y="84" width="26" height="38" rx="2" fill="#f4b95a" />
            <rect x="236" y="54" width="26" height="68" rx="2" fill="#7ee0c0" />
            <rect x="280" y="42" width="26" height="80" rx="2" fill="#ff9e5e" />
            <text x="386" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1898
            </text>
            <text x="386" y="88" fill="#c7b299" fontSize="10">
              石英验电器 · 虚拟电离信号分析
            </text>
          </g>
        ) : chapterId === "hist_09" ? (
          /* 1909-1911 Gold foil alpha scattering schematic */
          <g>
            <line
              x1="248"
              y1="26"
              x2="248"
              y2="142"
              stroke="#f4d58d"
              strokeWidth="4"
            />
            <circle cx="248" cy="84" r="6" fill="#ff8f6b" />
            <line
              x1="112"
              y1="52"
              x2="368"
              y2="52"
              stroke="#83cde9"
              strokeWidth="1.8"
            />
            <line
              x1="112"
              y1="116"
              x2="368"
              y2="116"
              stroke="#83cde9"
              strokeWidth="1.8"
            />
            <path
              d="M112,84 L236,84 Q242,84 234,76 L142,40"
              fill="none"
              stroke="#ff9e5e"
              strokeWidth="2.2"
              strokeDasharray="4 3"
            />
            <text x="404" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1909–1911
            </text>
            <text x="404" y="88" fill="#c7b299" fontSize="10">
              金箔散射观测室 · 原子核模型
            </text>
          </g>
        ) : chapterId === "hist_10" ? (
          /* 1909-1913 Haber-Bosch high-pressure reactor & gas recycle loop */
          <g>
            <rect
              x="210"
              y="32"
              width="76"
              height="104"
              rx="14"
              fill="rgba(255,158,94,0.14)"
              stroke="url(#copperGrad)"
              strokeWidth="2.6"
            />
            <path
              d="M136,64 L210,64 M286,64 L350,64 L350,116 L286,116"
              fill="none"
              stroke="#83cde9"
              strokeWidth="2"
            />
            <text
              x="248"
              y="80"
              textAnchor="middle"
              fill="#f4d58d"
              fontSize="11"
              fontWeight="700"
            >
              Fe 催化
            </text>
            <text
              x="248"
              y="98"
              textAnchor="middle"
              fill="#c5deed"
              fontSize="9.5"
            >
              450°C · 200 atm
            </text>
            <text x="394" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1909–1913
            </text>
            <text x="394" y="88" fill="#c7b299" fontSize="10">
              高压催化反应釜 · 原料气循环
            </text>
          </g>
        ) : (
          /* 1869 Periodic manuscript cards & glowing empty prediction slot */
          <g>
            {[0, 1, 2, 3].map((col) => (
              <rect
                key={col}
                x={118 + col * 72}
                y="34"
                width="60"
                height="42"
                rx="6"
                fill="#201d22"
                stroke="#c9935b"
                strokeOpacity="0.55"
              />
            ))}
            <text
              x="148"
              y="59"
              textAnchor="middle"
              fill="#edd8b9"
              fontSize="12"
              fontWeight="700"
            >
              Li · 7
            </text>
            <text
              x="220"
              y="59"
              textAnchor="middle"
              fill="#edd8b9"
              fontSize="12"
              fontWeight="700"
            >
              B · 11
            </text>
            <text
              x="292"
              y="59"
              textAnchor="middle"
              fill="#edd8b9"
              fontSize="12"
              fontWeight="700"
            >
              C · 12
            </text>
            <text
              x="364"
              y="59"
              textAnchor="middle"
              fill="#edd8b9"
              fontSize="12"
              fontWeight="700"
            >
              Al · 27
            </text>
            <rect
              x="262"
              y="90"
              width="90"
              height="46"
              rx="8"
              fill="rgba(168,146,255,0.18)"
              stroke="#b6a0ff"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <text
              x="307"
              y="117"
              textAnchor="middle"
              fill="#e7deff"
              fontSize="13"
              fontWeight="700"
            >
              ? 空位预言
            </text>
            <text x="424" y="68" fill="#e6be8a" fontSize="11" fontWeight="700">
              ARCHIVE 1869
            </text>
            <text x="424" y="88" fill="#c7b299" fontSize="10">
              元素手稿卡片 · 周期空位推理
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Abstract engraved-style SVG medallion for Scientist Archive cards (no unverified external portraits).
 */
export function ScientistMedallion({
  figure,
}: {
  figure: HistoricalFigureDef;
}) {
  const initials = figure.nameEn
    .split(/[\s-]+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  return (
    <svg className="scientist-medallion" viewBox="0 0 64 64" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="#1c1920"
        stroke="#d89d60"
        strokeWidth="2"
      />
      <circle
        cx="32"
        cy="32"
        r="23"
        fill="none"
        stroke="#d89d60"
        strokeOpacity="0.4"
        strokeDasharray="3 3"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fill="#f2cfa3"
        fontSize="16"
        fontWeight="700"
        letterSpacing="1"
      >
        {initials || "SC"}
      </text>
    </svg>
  );
}
