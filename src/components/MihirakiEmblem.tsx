import React from 'react';

interface MihirakiEmblemProps {
  className?: string;
  size?: number | string;
}

export const MihirakiEmblem: React.FC<MihirakiEmblemProps> = ({
  className = '',
  size = 56,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-label="Mihiraki Logo"
    >
      <defs>
        {/* Deep Obsidian Matte Background */}
        <linearGradient id="mihiraki-obsidian" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1e" />
          <stop offset="100%" stopColor="#0b0b0d" />
        </linearGradient>

        {/* Warm Manga Paper Gradient */}
        <linearGradient id="mihiraki-paperLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f5f2eb" />
          <stop offset="85%" stopColor="#ebe6dc" />
          <stop offset="100%" stopColor="#c9c2b4" />
        </linearGradient>

        <linearGradient id="mihiraki-paperRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c9c2b4" />
          <stop offset="15%" stopColor="#ebe6dc" />
          <stop offset="100%" stopColor="#f5f2eb" />
        </linearGradient>

        {/* Hard Neo-Brutalist Offset Shadow */}
        <filter id="mihiraki-hardShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="14" stdDeviation="0" floodColor="#000000" floodOpacity="0.85" />
        </filter>
      </defs>

      {/* Squircle Container */}
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="112"
        fill="url(#mihiraki-obsidian)"
        stroke="#2c2c32"
        strokeWidth="4"
      />

      {/* Subtle Background Grid */}
      <g stroke="#ffffff" strokeOpacity="0.03" strokeWidth="2">
        <line x1="256" y1="16" x2="256" y2="496" />
        <line x1="16" y1="256" x2="496" y2="256" />
      </g>

      {/* Main Emblem Group */}
      <g filter="url(#mihiraki-hardShadow)">
        {/* Back Stacked Landscape Frame */}
        <rect
          x="84"
          y="136"
          width="344"
          height="248"
          rx="14"
          fill="#d93829"
          stroke="#08080a"
          strokeWidth="14"
        />

        {/* Left Portrait Page */}
        <path
          d="M 104 112 L 252 136 L 252 388 L 104 364 Z"
          fill="url(#mihiraki-paperLeft)"
          stroke="#08080a"
          strokeWidth="14"
          strokeLinejoin="round"
        />

        {/* Right Portrait Page */}
        <path
          d="M 408 112 L 260 136 L 260 388 L 408 364 Z"
          fill="url(#mihiraki-paperRight)"
          stroke="#08080a"
          strokeWidth="14"
          strokeLinejoin="round"
        />

        {/* Manga Panel Borders (Koma) */}
        <polygon points="128,142 234,158 234,218 128,236" fill="#08080a" />
        <polygon points="278,158 384,142 384,196 278,212" fill="#08080a" />

        {/* The "Mihiraki" Bridge: Wide Landscape Slash Across Both Pages */}
        <polygon
          points="92,258 420,210 420,286 92,334"
          fill="#08080a"
          stroke="#f5f2eb"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        <polygon points="102,266 410,220 410,276 102,322" fill="#d93829" />

        {/* Speed-Line / Ink Katana Accent */}
        <polygon points="130,288 388,240 350,264" fill="#f5f2eb" />

        {/* Bottom Panel Blocks */}
        <polygon points="128,342 234,326 234,362 128,346" fill="#08080a" />
        <polygon points="278,318 384,302 384,344 278,362" fill="#08080a" />
      </g>
    </svg>
  );
};
