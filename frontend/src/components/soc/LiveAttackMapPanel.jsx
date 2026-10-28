import { useMemo } from "react";
import Panel from "../Panel";

function createWorldShapes() {
  return [
    {
      d: "M84 146 L144 108 L208 118 L252 142 L244 182 L198 200 L144 192 L100 174 Z",
      fill: "#071d2d",
    },
    {
      d: "M210 186 L244 170 L272 182 L286 210 L262 236 L218 238 L198 216 Z",
      fill: "#071d2d",
    },
    {
      d: "M292 128 L342 108 L382 118 L408 144 L400 174 L356 188 L314 182 L286 156 Z",
      fill: "#071d2d",
    },
    {
      d: "M420 118 L462 102 L518 110 L552 136 L566 168 L528 190 L474 186 L432 162 Z",
      fill: "#071d2d",
    },
    {
      d: "M560 146 L618 124 L684 134 L728 154 L736 184 L706 200 L646 202 L596 190 L558 176 Z",
      fill: "#071d2d",
    },
    {
      d: "M604 210 L638 196 L676 206 L692 232 L670 252 L622 250 L594 230 Z",
      fill: "#071d2d",
    },
    {
      d: "M420 220 L456 208 L486 220 L492 248 L474 270 L434 272 L410 246 Z",
      fill: "#071d2d",
    },
    {
      d: "M280 210 L302 200 L330 210 L336 236 L316 260 L286 256 L270 232 Z",
      fill: "#071d2d",
    },
    {
      d: "M260 272 L286 260 L318 270 L320 296 L298 318 L268 316 L248 288 Z",
      fill: "#071d2d",
    },
    {
      d: "M620 272 L652 260 L708 272 L720 312 L682 334 L630 326 L600 296 Z",
      fill: "#071d2d",
    },
  ];
}

function hashToPosition(ip = "") {
  let hash = 0;
  for (let i = 0; i < ip.length; i += 1) {
    hash = (hash * 31 + ip.charCodeAt(i)) >>> 0;
  }

  const x = 110 + (hash % 620);
  const y = 90 + ((hash >> 7) % 260);
  return { x, y };
}

function getSeverityColor(severity = "") {
  const value = String(severity).toLowerCase();
  if (value === "critical") return "#ff4fd8";
  if (value === "high") return "#ff66d8";
  if (value === "medium") return "#55d9ff";
  return "#d98cff";
}

export default function LiveAttackMapPanel({ attacks = [] }) {
  const worldShapes = useMemo(() => createWorldShapes(), []);

  const points = useMemo(() => {
    return attacks.slice(0, 24).map((attack, index) => {
      const ip = attack?.source_ip || attack?.ip || `unknown-${index}`;
      const severity = attack?.severity || "high";
      const pos = hashToPosition(ip);

      return {
        id: attack?.id || `${ip}-${attack?.timestamp || index}`,
        x: pos.x,
        y: pos.y,
        severity,
      };
    });
  }, [attacks]);

  return (
    <Panel
      title="Threat Intelligence"
      className="overflow-hidden border border-fuchsia-500/60 bg-[#02060d]"
    >
      <div className="relative h-[540px] overflow-hidden rounded-xl border border-fuchsia-500/60 bg-[#020914] shadow-[0_0_30px_rgba(255,0,200,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,0,200,0.12),_transparent_60%)]" />

        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[linear-gradient(rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px)] bg-[size:26px_26px]" />
        </div>

        <svg
          viewBox="0 0 760 540"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g opacity="0.9">
            {worldShapes.map((shape, index) => (
              <path
                key={index}
                d={shape.d}
                fill="#071d2d"
                stroke="#53d5ff"
                strokeOpacity="0.55"
                strokeWidth="1.2"
              />
            ))}
          </g>

          <g>
            {points.map((point, index) => {
              const hubX = 380;
              const hubY = 250;

              const curveX = (point.x + hubX) / 2;
              const curveY = Math.max(40, point.y - 90);

              return (
                <g key={point.id}>
                  <path
                    d={`M ${point.x} ${point.y} Q ${curveX} ${curveY} ${hubX} ${hubY}`}
                    stroke={getSeverityColor(point.severity)}
                    strokeWidth={index % 2 === 0 ? 2.4 : 1.5}
                    fill="none"
                    opacity="0.85"
                    filter="url(#glowPink)"
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={index % 2 === 0 ? 5.5 : 4}
                    fill={getSeverityColor(point.severity)}
                    filter="url(#glowPink)"
                  />

                  <circle cx={point.x} cy={point.y} r="1.9" fill="#fff" />
                </g>
              );
            })}
          </g>

          <g>
            <circle
              cx={380}
              cy={250}
              r="18"
              fill="rgba(255, 88, 210, 0.18)"
              filter="url(#glowPink)"
            />
            <circle
              cx={380}
              cy={250}
              r="9"
              fill="#ff5ad7"
              filter="url(#glowPink)"
            />
            <circle
              cx={380}
              cy={250}
              r="26"
              fill="rgba(255, 88, 210, 0.06)"
            />
          </g>

          <g opacity="0.6">
            {points.slice(0, 12).map((point, index) => (
              <circle
                key={`pulse-${point.id}`}
                cx={point.x}
                cy={point.y}
                r={index % 2 === 0 ? 10 : 8}
                fill="none"
                stroke="rgba(255,110,220,0.32)"
                strokeWidth="1"
              />
            ))}
          </g>
        </svg>

        <div className="absolute left-4 top-4 z-10 max-w-[220px]">
          <div className="text-[11px] uppercase tracking-[0.28em] font-bold text-fuchsia-300">
            Threat Intelligence
          </div>

          <div className="mt-3 space-y-1 text-[10px] text-fuchsia-200/80 font-mono">
            <div>• Scanning IPs...</div>
            <div>• Checking reputation...</div>
            <div>• Correlating threats...</div>
            <div>• Updating rules...</div>
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10">
          <div className="flex items-center gap-2 rounded-full border border-fuchsia-500/60 bg-[#0a0f1c]/90 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-fuchsia-200">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(255,99,214,1)]" />
            Live Monitoring
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-10 w-[210px] rounded border border-fuchsia-500/40 bg-black/15 p-2 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-fuchsia-200/90">
            <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400" />
            Attacker Location
          </div>

          <div className="space-y-2 text-[9px] uppercase tracking-[0.15em] text-fuchsia-200/80">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-500" />
              Network Hub
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" />
              Connection Path
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-300" />
              High Risk Region
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 z-10 flex items-end gap-5 text-right">
          <div className="text-[9px] uppercase tracking-[0.22em] text-fuchsia-200/80">
            <div>Total Attacks</div>
            <div className="mt-2 text-[18px] font-bold text-fuchsia-300">247</div>
          </div>

          <div className="text-[9px] uppercase tracking-[0.22em] text-fuchsia-200/80">
            <div>Blocked IPs</div>
            <div className="mt-2 text-[18px] font-bold text-fuchsia-300">189</div>
          </div>

          <div className="text-[9px] uppercase tracking-[0.22em] text-fuchsia-200/80">
            <div>Malicious Traffic</div>
            <div className="mt-2 text-[18px] font-bold text-fuchsia-300">68%</div>
          </div>

          <div className="rounded border border-fuchsia-500/60 bg-black/15 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-fuchsia-200">
            Threat Level
            <div className="mt-1 text-[16px] font-bold text-fuchsia-300">High</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}