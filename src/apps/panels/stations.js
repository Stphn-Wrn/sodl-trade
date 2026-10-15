// The scene drawn in the middle of a workbench: a cauldron, a forge or a carpenter's bench.
// Every drawing gets its own id, because hidden benches stay in the page and gradient ids must not clash.

function cauldron(id) {
  return `<svg class="sodl-station-art" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <radialGradient id="${id}-iron" cx="0.32" cy="0.25" r="0.85">
      <stop offset="0" stop-color="#4a4246"/>
      <stop offset="0.45" stop-color="#1b1719"/>
      <stop offset="1" stop-color="#050405"/>
    </radialGradient>
    <radialGradient id="${id}-brew" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0" class="sodl-cauldron-brew-core"/>
      <stop offset="1" class="sodl-cauldron-brew-edge"/>
    </radialGradient>
    <radialGradient id="${id}-coals" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff7a1a" stop-opacity="0.9"/>
      <stop offset="0.5" stop-color="#7a1a08" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#120604" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}-smoke" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>

  <g class="sodl-cauldron-tripod">
    <path d="M22 198 L100 8 L178 198"/>
    <circle cx="100" cy="9" r="5"/>
  </g>
  <path class="sodl-cauldron-chain" d="M100 12 L100 46"/>
  <path class="sodl-cauldron-bail" d="M32 80 Q100 20 168 80"/>

  <ellipse class="sodl-cauldron-coals" cx="100" cy="188" rx="64" ry="12" fill="url(#${id}-coals)"/>
  <path class="sodl-cauldron-log" d="M50 194 L150 180 M52 180 L148 194"/>
  <g class="sodl-cauldron-fire" transform="translate(100 192) scale(1.7 1.15) translate(-100 -192)">
    <path class="sodl-cauldron-flame is-outer" d="M100 192 C74 192 66 174 78 158 C78 170 86 170 86 162 C86 148 96 142 98 128 C108 144 118 150 114 166 C120 160 122 154 122 150 C132 166 126 192 100 192 Z"/>
    <path class="sodl-cauldron-flame is-middle" d="M100 192 C82 192 78 178 86 168 C88 176 94 174 94 166 C102 172 112 178 110 186 C108 190 104 192 100 192 Z"/>
    <path class="sodl-cauldron-flame is-inner" d="M100 192 C92 192 90 184 96 178 C98 182 102 182 102 178 C106 182 108 188 106 190 C104 192 102 192 100 192 Z"/>
  </g>
  <g class="sodl-cauldron-embers">
    <circle cx="80" cy="170" r="1.4"/>
    <circle cx="112" cy="166" r="1.2"/>
    <circle cx="96" cy="172" r="1"/>
    <circle cx="124" cy="174" r="1.3"/>
  </g>
  <g class="sodl-cauldron-bone">
    <path d="M30 192 L66 184"/>
    <circle cx="28" cy="190" r="3"/><circle cx="30" cy="195" r="3"/>
    <circle cx="67" cy="181" r="3"/><circle cx="69" cy="186" r="3"/>
  </g>

  <path class="sodl-cauldron-foot" d="M48 152 L40 176 L56 168 Z M152 152 L160 176 L144 168 Z"/>
  <path class="sodl-cauldron-body" d="M24 82 C18 146 60 168 100 168 C140 168 182 146 176 82 Z" fill="url(#${id}-iron)"/>
  <path class="sodl-cauldron-rust" d="M38 120 C44 112 56 118 52 128 C48 136 36 132 38 120 Z M140 140 C148 132 160 140 154 150 C148 156 136 150 140 140 Z M92 150 C100 146 110 152 104 158 C98 162 88 156 92 150 Z"/>
  <path class="sodl-cauldron-band" d="M26 108 C60 126 140 126 174 108"/>
  <g class="sodl-cauldron-rivets">
    <circle cx="44" cy="115" r="2.6"/><circle cx="72" cy="121" r="2.6"/><circle cx="100" cy="123" r="2.6"/><circle cx="128" cy="121" r="2.6"/><circle cx="156" cy="115" r="2.6"/>
  </g>
  <g class="sodl-cauldron-runes">
    <path d="M70 140 L70 156 M64 144 L70 150 L76 144"/>
    <path d="M94 138 L94 158 M94 142 L104 148 L94 154"/>
    <path d="M124 140 L130 148 L124 156 L118 148 Z M118 156 L114 160 M130 156 L134 160"/>
  </g>
  <path class="sodl-cauldron-shine" d="M36 96 C38 122 50 142 66 154"/>

  <ellipse class="sodl-cauldron-ear" cx="26" cy="84" rx="7" ry="9"/>
  <ellipse class="sodl-cauldron-ear" cx="174" cy="84" rx="7" ry="9"/>
  <ellipse class="sodl-cauldron-rim" cx="100" cy="82" rx="78" ry="17"/>
  <ellipse class="sodl-cauldron-mouth" cx="100" cy="83" rx="69" ry="12.5"/>
  <ellipse class="sodl-cauldron-liquid" cx="100" cy="86" rx="64" ry="9.5" fill="url(#${id}-brew)"/>
  <g transform="translate(100 86) scale(1 0.15)">
    <path class="sodl-cauldron-swirl" d="M0 0 C20 -6 34 14 18 30 C-6 52 -48 26 -40 -8 C-32 -44 20 -54 44 -26"/>
  </g>
  <ellipse class="sodl-cauldron-light" cx="100" cy="84" rx="52" ry="6" filter="url(#${id}-glow)"/>
  <g class="sodl-cauldron-bubbles">
    <circle cx="74" cy="86" r="3"/>
    <circle cx="104" cy="88" r="4"/>
    <circle cx="128" cy="85" r="2.6"/>
    <circle cx="90" cy="84" r="2"/>
  </g>
  <path class="sodl-cauldron-drip" d="M66 93 C66 99 64 102 64 106 C64 110 70 110 70 106 C70 102 68 99 68 93 Z"/>
  <path class="sodl-cauldron-drip" d="M138 93 C138 97 137 99 137 101 C137 104 141 104 141 101 C141 99 140 97 140 93 Z"/>

  <g class="sodl-cauldron-smoke" filter="url(#${id}-smoke)">
    <ellipse cx="86" cy="70" rx="16" ry="10"/>
    <ellipse cx="112" cy="66" rx="18" ry="11"/>
    <ellipse cx="98" cy="62" rx="14" ry="9"/>
  </g>
</svg>`;
}

function forge(id) {
  return `<svg class="sodl-station-art" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="${id}-anvil" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#4b4448"/>
      <stop offset="0.25" stop-color="#211d1f"/>
      <stop offset="1" stop-color="#080708"/>
    </linearGradient>
    <linearGradient id="${id}-wood" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#1f140c"/>
      <stop offset="0.5" stop-color="#3a2616"/>
      <stop offset="1" stop-color="#150d07"/>
    </linearGradient>
    <radialGradient id="${id}-heat" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ff9a3c" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff4d00" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>

  <ellipse class="sodl-forge-heat" cx="100" cy="92" rx="80" ry="60" fill="url(#${id}-heat)"/>
  <ellipse class="sodl-forge-ground" cx="100" cy="194" rx="86" ry="6"/>
  <path class="sodl-forge-stump" d="M62 140 L56 194 L144 194 L138 140 Z" fill="url(#${id}-wood)"/>
  <path class="sodl-forge-cracks" d="M78 150 L74 186 M100 146 L102 190 M124 152 L128 182"/>
  <ellipse class="sodl-forge-rings" cx="100" cy="140" rx="38" ry="7"/>

  <path class="sodl-forge-anvil" d="M12 92 C28 86 40 84 50 84 L162 84 L162 100 L138 104 L128 120 L144 140 L56 140 L72 120 L64 104 L50 102 C34 100 22 96 12 92 Z" fill="url(#${id}-anvil)"/>
  <path class="sodl-forge-edge" d="M50 84 L162 84"/>
  <path class="sodl-forge-runes" d="M88 124 L88 134 M84 128 L92 128 M104 122 L110 130 L104 136 M116 124 L116 134"/>

  <rect class="sodl-forge-ingot" x="78" y="74" width="46" height="10" rx="2"/>
  <rect class="sodl-forge-ingot-glow" x="78" y="74" width="46" height="10" rx="2" filter="url(#${id}-glow)"/>

  <g class="sodl-forge-hammer">
    <path class="sodl-forge-handle" d="M150 192 L178 126"/>
    <rect class="sodl-forge-head" x="164" y="112" width="30" height="14" rx="2" transform="rotate(23 179 119)"/>
  </g>
  <path class="sodl-forge-tongs" d="M18 194 L46 120 M30 194 L50 122"/>

  <g class="sodl-forge-sparks">
    <circle cx="96" cy="72" r="1.6"/>
    <circle cx="108" cy="70" r="1.3"/>
    <circle cx="88" cy="74" r="1.2"/>
    <circle cx="116" cy="73" r="1.5"/>
    <circle cx="102" cy="68" r="1.1"/>
    <circle cx="92" cy="70" r="1.4"/>
  </g>
</svg>`;
}

function workbench(id) {
  return `<svg class="sodl-station-art" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="${id}-plank" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#5a3c24"/>
      <stop offset="1" stop-color="#2b1b0f"/>
    </linearGradient>
    <radialGradient id="${id}-candle" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffcf7a" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect class="sodl-bench-wall" x="16" y="18" width="168" height="84" rx="3"/>
  <g class="sodl-bench-pegs">
    <path d="M40 30 L40 36 M76 30 L76 36 M124 30 L124 36 M160 30 L160 36"/>
    <path class="sodl-bench-hung" d="M40 36 L40 74 M32 74 L48 74 L48 82 L32 82 Z"/>
    <path class="sodl-bench-hung" d="M76 36 C66 50 66 70 76 84 C86 70 86 50 76 36 Z"/>
    <path class="sodl-bench-hung" d="M124 36 L118 80 M124 36 L130 80"/>
    <path class="sodl-bench-hung" d="M160 36 L160 60 M150 60 L170 60 L166 86 L154 86 Z"/>
  </g>
  <ellipse class="sodl-bench-light" cx="156" cy="96" rx="60" ry="46" fill="url(#${id}-candle)"/>

  <rect class="sodl-bench-leg" x="26" y="122" width="12" height="72"/>
  <rect class="sodl-bench-leg" x="162" y="122" width="12" height="72"/>
  <rect class="sodl-bench-leg" x="34" y="166" width="132" height="8"/>
  <rect class="sodl-bench-top" x="12" y="108" width="176" height="16" rx="2" fill="url(#${id}-plank)"/>
  <path class="sodl-bench-grain" d="M20 114 L90 114 M104 118 L180 118"/>

  <g class="sodl-bench-saw">
    <path class="sodl-bench-blade" d="M30 104 L92 96 L92 104 Z"/>
    <path class="sodl-bench-teeth" d="M30 104 L34 106 L38 104 L42 106 L46 104 L50 106 L54 104 L58 106 L62 104 L66 106 L70 104 L74 106 L78 104 L82 106 L86 104 L92 104"/>
    <rect class="sodl-bench-handle" x="90" y="92" width="14" height="14" rx="4"/>
  </g>
  <g class="sodl-bench-mallet">
    <rect x="110" y="94" width="22" height="13" rx="3"/>
    <path d="M132 100 L156 104"/>
  </g>
  <g class="sodl-bench-shavings">
    <path d="M60 128 C66 122 74 128 68 134 C64 138 58 134 62 130"/>
    <path d="M120 130 C126 124 134 130 128 136"/>
    <path d="M90 186 C96 180 104 186 98 192"/>
  </g>

  <rect class="sodl-bench-candle" x="164" y="82" width="10" height="26" rx="2"/>
  <path class="sodl-bench-wick" d="M169 82 L169 77"/>
  <path class="sodl-bench-flame" d="M169 62 C175 70 175 78 169 79 C163 78 163 70 169 62 Z"/>
</svg>`;
}

const STATIONS = { cauldron, forge, workbench };

export function stationSvg(station, id) {
  return `<div class="sodl-station sodl-${station}" data-craft-station>${STATIONS[station](id)}<div class="sodl-station-puff"></div></div>`;
}
