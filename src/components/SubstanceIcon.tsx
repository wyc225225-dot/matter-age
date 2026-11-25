import { useId } from "react";
import type { Substance } from "../types";
/** All illustrations are local SVGs, with shared material, lighting and geometry. */
export function SubstanceIcon({
  s,
  size = 60,
}: {
  s: Substance;
  size?: number;
}) {
  const uid = useId().replaceAll(":", "");
  const color = s.color;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="substance-icon"
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2=".85" y2="1">
          <stop stopColor="#f3fbff" stopOpacity=".95" />
          <stop offset=".38" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".35" />
        </linearGradient>
        <radialGradient id={`${uid}g`}>
          <stop stopColor={color} stopOpacity=".25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="83" rx="35" ry="10" fill={`url(#${uid}g)`} />
      {s.id === "wood" ? (
        <g stroke="#553c2e" strokeWidth="2">
          <path d="M25 34l43-9 12 44-43 12z" fill={`url(#${uid})`} />
          <path d="M34 38l33-7M38 52l30-7M41 65l31-7" />
          <ellipse cx="31" cy="58" rx="10" ry="24" fill="#b48a61" />
          <ellipse cx="31" cy="58" rx="5" ry="16" fill="none" />
        </g>
      ) : s.id === "ice" ? (
        <g stroke="#d3efff" strokeOpacity=".5">
          <path
            d="M24 33l29-13 27 17-2 35-30 14-26-18z"
            fill={`url(#${uid})`}
          />
          <path d="M24 33l26 18 30-14M50 51l-2 35" fill="none" />
        </g>
      ) : s.iconId === "gas" ? (
        <g fill={`url(#${uid})`} stroke={color} strokeOpacity=".4">
          <circle cx="42" cy="42" r="21" />
          <circle cx="65" cy="53" r="20" />
          <circle cx="36" cy="65" r="17" />
          <circle cx="64" cy="24" r="6" />
          <circle cx="22" cy="29" r="4" />
        </g>
      ) : s.iconId === "liquid" ? (
        <g>
          <path
            d="M50 12C43 29 23 47 23 62a27 27 0 0054 0C77 47 57 29 50 12Z"
            fill={`url(#${uid})`}
            stroke={color}
            strokeOpacity=".6"
          />
          <path
            d="M34 51q-8 18 4 22"
            stroke="white"
            strokeOpacity=".6"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : s.iconId === "metal" ? (
        <g stroke={color} strokeOpacity=".6">
          <path d="M16 59l19-28h37l14 28-18 15H32Z" fill={`url(#${uid})`} />
          <path
            d="M16 59h70M35 31l-3 43M72 31l-4 43"
            fill="none"
            stroke="#edfaff"
            strokeOpacity=".4"
          />
        </g>
      ) : (
        <g stroke={color} strokeOpacity=".65">
          <path
            d="M27 70l2-33 19-20 17 19 13 38-29 10z"
            fill={`url(#${uid})`}
          />
          <path
            d="M48 17l1 67M29 37l20 12 16-13M49 49l29 25"
            fill="none"
            stroke="#fff"
            strokeOpacity=".3"
          />
          <path d="M18 71l4-19 12 2 9 25z" fill={color} opacity=".8" />
        </g>
      )}
    </svg>
  );
}
