import type { EquipmentDef, LabLevelDef } from "../types";

export function IsometricLabBench({
  labLevel,
  labDef,
  equipmentLevels,
  equipmentList,
  selectedEquipmentId,
  onSelectEquipment,
}: {
  labLevel: number;
  labDef: LabLevelDef;
  equipmentLevels: Record<string, number>;
  equipmentList: EquipmentDef[];
  selectedEquipmentId: string | null;
  onSelectEquipment: (id: string) => void;
}) {
  const installedCount = Object.keys(equipmentLevels).length;
  const wallAccent =
    labLevel >= 3 ? "#f4b95a" : labLevel === 2 ? "#53b8f3" : "#4cc38a";
  const floorGlow =
    labLevel >= 3
      ? "rgba(244,185,90,0.16)"
      : labLevel === 2
        ? "rgba(83,184,243,0.16)"
        : "rgba(76,195,138,0.14)";

  return (
    <div className="iso-lab-stage">
      <div className="iso-lab-hud">
        <div>
          <span className="eyebrow">{labDef.en}</span>
          <h3>{labDef.name}</h3>
        </div>
        <div className="iso-lab-badges">
          <span className="pill-badge">
            设备 {installedCount}/{labDef.equipmentCapacity}
          </span>
          <span className="pill-badge">
            单次批量上限 ×{labDef.maxBatchMultiplier}+
          </span>
          <span className="pill-badge accent">
            活跃订单槽位 {labDef.activeOrderSlots}
          </span>
        </div>
      </div>

      <svg
        className="iso-lab-svg"
        viewBox="0 0 720 340"
        role="img"
        aria-label={`Lv.${labLevel} ${labDef.name} 2D 等距实验台场景`}
      >
        <defs>
          <linearGradient id="isoBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a1624" />
            <stop offset="60%" stopColor="#102338" />
            <stop offset="100%" stopColor="#0c1a2a" />
          </linearGradient>
          <linearGradient id="benchTop" x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0%"
              stopColor={labLevel >= 3 ? "#2b3b52" : "#1f3247"}
            />
            <stop offset="100%" stopColor="#142334" />
          </linearGradient>
          <linearGradient id="benchFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#122133" />
            <stop offset="100%" stopColor="#09131e" />
          </linearGradient>
          <radialGradient id="labGlow" cx="50%" cy="48%" r="48%">
            <stop offset="0%" stopColor={floorGlow} />
            <stop offset="100%" stopColor="rgba(10,22,36,0)" />
          </radialGradient>
        </defs>

        {/* Backdrop & isometric grid */}
        <rect width="720" height="340" rx="18" fill="url(#isoBg)" />
        <ellipse cx="360" cy="200" rx="310" ry="115" fill="url(#labGlow)" />
        <g stroke="#294866" strokeOpacity="0.22" strokeWidth="1">
          {[40, 80, 120, 160, 200, 240, 280].map((y) => (
            <line key={y} x1="20" y1={y} x2="700" y2={y} />
          ))}
          {[80, 160, 240, 320, 400, 480, 560, 640].map((x) => (
            <line key={x} x1={x} y1="20" x2={x} y2="320" />
          ))}
        </g>

        {/* Back wall upgrades by Lab Level */}
        <polygon
          points="70,62 360,24 650,62 650,152 360,114 70,152"
          fill="#0f2033"
          stroke={wallAccent}
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />

        {/* Lv.2+ Fume hood & reagent shelf */}
        {labLevel >= 2 && (
          <g>
            <rect
              x="120"
              y="58"
              width="135"
              height="44"
              rx="6"
              fill="#152b42"
              stroke="#53b8f3"
              strokeOpacity="0.5"
            />
            <rect
              x="134"
              y="68"
              width="16"
              height="24"
              rx="3"
              fill="#53b8f3"
              opacity="0.65"
            />
            <rect
              x="158"
              y="72"
              width="16"
              height="20"
              rx="3"
              fill="#53d89f"
              opacity="0.65"
            />
            <rect
              x="182"
              y="66"
              width="16"
              height="26"
              rx="3"
              fill="#f4b95a"
              opacity="0.7"
            />
            <rect
              x="206"
              y="70"
              width="16"
              height="22"
              rx="3"
              fill="#a892ff"
              opacity="0.65"
            />
            <text x="128" y="52" fill="#89c9ee" fontSize="10" fontWeight="600">
              标准试剂架 · LV.2
            </text>
          </g>
        )}

        {/* Lv.3+ High-temp ventilation & telemetry board */}
        {labLevel >= 3 && (
          <g>
            <rect
              x="468"
              y="54"
              width="148"
              height="48"
              rx="6"
              fill="#1c273b"
              stroke="#f4b95a"
              strokeOpacity="0.6"
            />
            <polyline
              points="480,88 502,72 522,82 544,64 568,75 598,62"
              fill="none"
              stroke="#f4b95a"
              strokeWidth="2"
            />
            <circle cx="598" cy="62" r="3.5" fill="#f7d469" />
            <text x="476" y="48" fill="#f4c77b" fontSize="10" fontWeight="600">
              定量监控中枢 · LV.3
            </text>
          </g>
        )}

        {/* Isometric main workbench slab */}
        <polygon
          points="75,210 360,115 645,210 360,305"
          fill="url(#benchTop)"
          stroke={wallAccent}
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        <polygon
          points="75,210 360,305 360,328 75,233"
          fill="url(#benchFront)"
          stroke="#27425d"
          strokeWidth="1.2"
        />
        <polygon
          points="645,210 360,305 360,328 645,233"
          fill="#0b1826"
          stroke="#27425d"
          strokeWidth="1.2"
        />

        {/* Bench center reaction ring */}
        <ellipse
          cx="360"
          cy="210"
          rx="62"
          ry="24"
          fill="none"
          stroke={wallAccent}
          strokeOpacity="0.35"
          strokeDasharray="5 4"
        />

        {/* Equipment stations plotted directly on the isometric bench */}
        {equipmentList
          .filter((e) => !e.lockedPreview)
          .map((eq) => {
            const lv = equipmentLevels[eq.id] ?? 0;
            const installed = lv > 0;
            const selected = selectedEquipmentId === eq.id;
            const { x, y } = eq.benchSlot;
            const color = installed
              ? eq.category === "thermal"
                ? "#ff9854"
                : eq.category === "electrochemistry"
                  ? "#63c8ff"
                  : eq.category === "separation"
                    ? "#5ce0b8"
                    : eq.category === "analysis"
                      ? "#f4c85a"
                      : "#7cc8ff"
              : "#4d647a";

            return (
              <g
                key={eq.id}
                transform={`translate(${x}, ${y})`}
                className="iso-equip-node"
                onClick={() => onSelectEquipment(eq.id)}
                style={{ cursor: "pointer" }}
              >
                <ellipse
                  cx="0"
                  cy="16"
                  rx="30"
                  ry="12"
                  fill={installed ? color : "#1b2c3d"}
                  fillOpacity={installed ? 0.22 : 0.35}
                  stroke={selected ? "#ffffff" : color}
                  strokeWidth={selected ? 2 : 1.2}
                  strokeDasharray={installed ? undefined : "3 3"}
                />
                {/* Stylized 2D instrument silhouette */}
                {installed ? (
                  <g>
                    <rect
                      x="-14"
                      y="-14"
                      width="28"
                      height="24"
                      rx="5"
                      fill="#13293f"
                      stroke={color}
                      strokeWidth="1.8"
                    />
                    <circle
                      cx="0"
                      cy="-2"
                      r="5.5"
                      fill={color}
                      opacity="0.88"
                    />
                    <rect
                      x="10"
                      y="-18"
                      width="22"
                      height="13"
                      rx="6"
                      fill={color}
                    />
                    <text
                      x="21"
                      y="-9"
                      textAnchor="middle"
                      fill="#07131e"
                      fontSize="8.5"
                      fontWeight="700"
                    >
                      L{lv}
                    </text>
                  </g>
                ) : (
                  <g opacity="0.55">
                    <rect
                      x="-12"
                      y="-10"
                      width="24"
                      height="18"
                      rx="4"
                      fill="#0e1c2b"
                      stroke="#536f8a"
                      strokeDasharray="2 2"
                    />
                    <text
                      x="0"
                      y="2"
                      textAnchor="middle"
                      fill="#8ca8c2"
                      fontSize="11"
                    >
                      +
                    </text>
                  </g>
                )}
                <text
                  x="0"
                  y="36"
                  textAnchor="middle"
                  fill={installed ? "#e8f4ff" : "#7c98b3"}
                  fontSize="10.5"
                  fontWeight={installed ? "600" : "400"}
                >
                  {eq.name}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
