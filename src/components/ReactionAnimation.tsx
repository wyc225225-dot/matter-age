import { useEffect, useRef } from "react";
import type { Animation } from "../types";

const defaultColors: Record<Animation, string> = {
  energy_release: "#eac477",
  bubbles: "#83cde9",
  precipitate: "#9bc9e9",
  dissolve: "#83d9c3",
  crystallize: "#daeaff",
  color_change: "#83cde9",
  vaporize: "#c5dfe5",
  freeze: "#9bd9ff",
  melt: "#83cde9",
  condense: "#b7dce6",
};

export function ReactionAnimation({
  type,
  reduced,
  accentColor,
}: {
  type: Animation;
  reduced: boolean;
  accentColor?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    const start = performance.now();
    const tone = accentColor || defaultColors[type];

    function draw(now: number) {
      const t = (now - start) / 1000;
      const progress = Math.min(t / 2.4, 1);
      ctx!.clearRect(0, 0, 420, 200);

      // Ambient reaction core glow
      if (
        type === "energy_release" ||
        type === "color_change" ||
        type === "dissolve"
      ) {
        const radius = 35 + Math.sin(progress * Math.PI) * 95;
        const grad = ctx!.createRadialGradient(210, 105, 4, 210, 105, radius);
        grad.addColorStop(0, type === "energy_release" ? "#fff2c6" : tone);
        grad.addColorStop(0.5, type === "energy_release" ? "#eac477" : tone);
        grad.addColorStop(1, "transparent");
        ctx!.save();
        ctx!.globalAlpha =
          Math.sin(progress * Math.PI) *
          (type === "energy_release" ? 0.36 : 0.25);
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, 420, 200);
        ctx!.restore();
      }

      // Settling sediment bed for precipitate
      if (type === "precipitate") {
        ctx!.save();
        ctx!.globalAlpha = progress * 0.28;
        ctx!.fillStyle = tone;
        ctx!.beginPath();
        ctx!.ellipse(
          210,
          184,
          70 + progress * 45,
          8 + progress * 7,
          0,
          0,
          Math.PI * 2,
        );
        ctx!.fill();
        ctx!.restore();
      }

      for (let i = 0; i < 40; i++) {
        const seed = i * 2.39996;
        const phase = (t * 0.45 + i / 40) % 1;
        const alpha = Math.sin(phase * Math.PI) * 0.82;
        ctx!.save();
        ctx!.globalAlpha = alpha;

        if (type === "bubbles") {
          const x = 135 + ((i * 29) % 150) + Math.sin(t * 3 + seed) * 6;
          const y = 182 - phase * 155;
          const r = 2.5 + (i % 4) * 1.3;
          ctx!.strokeStyle = "#b9ecff";
          ctx!.fillStyle = "#83cde9";
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.globalAlpha = alpha * 0.25;
          ctx!.fill();
          ctx!.globalAlpha = alpha * 0.9;
          ctx!.stroke();
        } else if (type === "precipitate") {
          const x = 125 + ((i * 31) % 170) + Math.sin(seed + t) * 4;
          const y = 26 + phase * 152;
          const r = 2.4 + (i % 3) * 0.9;
          ctx!.fillStyle = tone;
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (type === "energy_release") {
          const dist = phase * 145;
          const x = 210 + Math.cos(seed) * dist;
          const y = 108 + Math.sin(seed) * dist * 0.65;
          const r = 2.2 + (1 - phase) * 2.4;
          ctx!.fillStyle = i % 3 === 0 ? "#fff4d2" : "#eac477";
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (type === "freeze") {
          const dist = phase * 88;
          const x = 210 + Math.cos(seed) * dist;
          const y = 100 + Math.sin(seed) * dist * 0.72;
          const sz = 4 + (i % 3) * 2;
          ctx!.strokeStyle = "#bfe8ff";
          ctx!.lineWidth = 1.2;
          ctx!.translate(x, y);
          ctx!.rotate(seed + t * 0.3);
          for (let arm = 0; arm < 3; arm++) {
            ctx!.rotate(Math.PI / 3);
            ctx!.beginPath();
            ctx!.moveTo(-sz, 0);
            ctx!.lineTo(sz, 0);
            ctx!.stroke();
          }
        } else if (type === "crystallize") {
          const dist = phase * 78;
          const x = 210 + Math.cos(seed) * dist;
          const y = 108 + Math.sin(seed) * dist * 0.62;
          const sz = 3.5 + (i % 3) * 1.4;
          ctx!.fillStyle = tone;
          ctx!.strokeStyle = "#f2f8ff";
          ctx!.lineWidth = 0.8;
          ctx!.translate(x, y);
          ctx!.rotate(Math.PI / 4 + seed * 0.2);
          ctx!.fillRect(-sz, -sz, sz * 2, sz * 2);
          ctx!.strokeRect(-sz, -sz, sz * 2, sz * 2);
        } else if (type === "vaporize") {
          const x = 145 + ((i * 27) % 130) + Math.sin(t * 1.6 + seed) * 14;
          const y = 175 - phase * 145;
          const r = 5 + phase * 10;
          ctx!.fillStyle = "#cde4ec";
          ctx!.globalAlpha = alpha * 0.28;
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (type === "melt" || type === "condense") {
          const x = 140 + ((i * 23) % 140);
          const y = 24 + phase * 150;
          const r = type === "condense" ? 2.4 + (i % 2) : 3.2;
          ctx!.fillStyle = type === "condense" ? "#b7dce6" : "#83cde9";
          ctx!.beginPath();
          ctx!.ellipse(x, y, r * 0.85, r * 1.35, 0, 0, Math.PI * 2);
          ctx!.fill();
        } else if (type === "dissolve") {
          const angle = seed + t * 1.8;
          const dist = 16 + phase * 82;
          const x = 210 + Math.cos(angle) * dist;
          const y = 105 + Math.sin(angle) * dist * 0.52;
          ctx!.fillStyle = tone;
          ctx!.beginPath();
          ctx!.arc(x, y, 2.2 + (1 - phase) * 1.6, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          // color_change: smooth tinted particles shifting to product tone
          const dist = 20 + phase * 86;
          const x = 210 + Math.cos(seed + t * 0.5) * dist;
          const y = 105 + Math.sin(seed + t * 0.5) * dist * 0.6;
          ctx!.fillStyle = tone;
          ctx!.beginPath();
          ctx!.arc(x, y, 3 + Math.sin(seed) * 1.2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }
      if (t < 2.4) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [type, reduced, accentColor]);

  return (
    <canvas
      ref={ref}
      width="420"
      height="200"
      className="reaction-canvas"
      aria-label={`${type} 实验动画`}
    />
  );
}
