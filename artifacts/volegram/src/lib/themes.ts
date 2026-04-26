export type ThemeId = "classic" | "midnight" | "bitcoin" | "forest" | "royal" | "crimson" | "ocean" | "matrix";

export interface VBCTheme {
  id: ThemeId;
  name: string;
  emoji: string;
  preview: string[];
  "--app-bg": string;
  "--app-card": string;
  "--app-nav": string;
  "--app-header": string;
  "--app-border": string;
  "--app-text": string;
  "--app-text-sub": string;
  "--app-text-dim": string;
  "--app-accent": string;
  "--app-accent-text": string;
  "--app-balance-bg": string;
  "--app-balance-text": string;
  "--app-balance-sub": string;
  "--app-bubble-me": string;
  "--app-bubble-me-text": string;
  "--app-divider": string;
  "--app-input-bg": string;
}

export const THEMES: Record<ThemeId, VBCTheme> = {
  classic: {
    id: "classic", name: "Classic", emoji: "🖤",
    preview: ["#f8f8f8", "#ffffff", "#F7931A"],
    "--app-bg": "#f8f8f8",
    "--app-card": "#ffffff",
    "--app-nav": "#ffffff",
    "--app-header": "#ffffff",
    "--app-border": "#f0f0f0",
    "--app-text": "#0a0a0a",
    "--app-text-sub": "#525252",
    "--app-text-dim": "#a3a3a3",
    "--app-accent": "#F7931A",
    "--app-accent-text": "#ffffff",
    "--app-balance-bg": "#000000",
    "--app-balance-text": "#ffffff",
    "--app-balance-sub": "rgba(255,255,255,0.35)",
    "--app-bubble-me": "#0a0a0a",
    "--app-bubble-me-text": "#ffffff",
    "--app-divider": "#f5f5f5",
    "--app-input-bg": "#f8f8f8",
  },
  midnight: {
    id: "midnight", name: "Midnight", emoji: "🌌",
    preview: ["#0d0f14", "#1a1d26", "#F7931A"],
    "--app-bg": "#0d0f14",
    "--app-card": "#1a1d26",
    "--app-nav": "#111318",
    "--app-header": "#111318",
    "--app-border": "#2a2d3a",
    "--app-text": "#eef0f5",
    "--app-text-sub": "#7a8899",
    "--app-text-dim": "#4a5260",
    "--app-accent": "#F7931A",
    "--app-accent-text": "#ffffff",
    "--app-balance-bg": "#1a1d26",
    "--app-balance-text": "#ffffff",
    "--app-balance-sub": "rgba(255,255,255,0.35)",
    "--app-bubble-me": "#2a3a50",
    "--app-bubble-me-text": "#ffffff",
    "--app-divider": "#1e2130",
    "--app-input-bg": "#0d0f14",
  },
  bitcoin: {
    id: "bitcoin", name: "Bitcoin", emoji: "₿",
    preview: ["#1a0e00", "#251400", "#F7931A"],
    "--app-bg": "#1a0e00",
    "--app-card": "#251a00",
    "--app-nav": "#150b00",
    "--app-header": "#150b00",
    "--app-border": "#3d2800",
    "--app-text": "#ffe8b0",
    "--app-text-sub": "#c08040",
    "--app-text-dim": "#7a4a10",
    "--app-accent": "#F7931A",
    "--app-accent-text": "#000000",
    "--app-balance-bg": "#F7931A",
    "--app-balance-text": "#000000",
    "--app-balance-sub": "rgba(0,0,0,0.4)",
    "--app-bubble-me": "#F7931A",
    "--app-bubble-me-text": "#000000",
    "--app-divider": "#2d1a00",
    "--app-input-bg": "#1a0e00",
  },
  forest: {
    id: "forest", name: "Forest", emoji: "🌲",
    preview: ["#040d08", "#0a1a10", "#22c55e"],
    "--app-bg": "#040d08",
    "--app-card": "#091610",
    "--app-nav": "#030a06",
    "--app-header": "#030a06",
    "--app-border": "#122a1a",
    "--app-text": "#c8f0d8",
    "--app-text-sub": "#4a8060",
    "--app-text-dim": "#26503a",
    "--app-accent": "#22c55e",
    "--app-accent-text": "#ffffff",
    "--app-balance-bg": "#0d2a14",
    "--app-balance-text": "#c8f0d8",
    "--app-balance-sub": "rgba(200,240,216,0.35)",
    "--app-bubble-me": "#166534",
    "--app-bubble-me-text": "#ffffff",
    "--app-divider": "#0c1e12",
    "--app-input-bg": "#040d08",
  },
  royal: {
    id: "royal", name: "Royal", emoji: "👑",
    preview: ["#080512", "#100d20", "#a855f7"],
    "--app-bg": "#080512",
    "--app-card": "#100d20",
    "--app-nav": "#060410",
    "--app-header": "#060410",
    "--app-border": "#1e1640",
    "--app-text": "#e8d8ff",
    "--app-text-sub": "#7050a0",
    "--app-text-dim": "#3a2860",
    "--app-accent": "#a855f7",
    "--app-accent-text": "#ffffff",
    "--app-balance-bg": "#1a0d36",
    "--app-balance-text": "#e8d8ff",
    "--app-balance-sub": "rgba(232,216,255,0.3)",
    "--app-bubble-me": "#6d28d9",
    "--app-bubble-me-text": "#ffffff",
    "--app-divider": "#120e22",
    "--app-input-bg": "#080512",
  },
  crimson: {
    id: "crimson", name: "Crimson", emoji: "🔥",
    preview: ["#0f0404", "#1c0a0a", "#ef4444"],
    "--app-bg": "#0f0404",
    "--app-card": "#1a0808",
    "--app-nav": "#0c0303",
    "--app-header": "#0c0303",
    "--app-border": "#3a1010",
    "--app-text": "#ffe4e4",
    "--app-text-sub": "#8a4040",
    "--app-text-dim": "#4a1a1a",
    "--app-accent": "#ef4444",
    "--app-accent-text": "#ffffff",
    "--app-balance-bg": "#280606",
    "--app-balance-text": "#ffe4e4",
    "--app-balance-sub": "rgba(255,228,228,0.3)",
    "--app-bubble-me": "#991b1b",
    "--app-bubble-me-text": "#ffffff",
    "--app-divider": "#1a0808",
    "--app-input-bg": "#0f0404",
  },
  ocean: {
    id: "ocean", name: "Ocean", emoji: "🌊",
    preview: ["#030b14", "#071826", "#0ea5e9"],
    "--app-bg": "#030b14",
    "--app-card": "#071826",
    "--app-nav": "#020810",
    "--app-header": "#020810",
    "--app-border": "#0e2a40",
    "--app-text": "#c8e8ff",
    "--app-text-sub": "#3a7090",
    "--app-text-dim": "#1a3a50",
    "--app-accent": "#0ea5e9",
    "--app-accent-text": "#ffffff",
    "--app-balance-bg": "#071826",
    "--app-balance-text": "#c8e8ff",
    "--app-balance-sub": "rgba(200,232,255,0.3)",
    "--app-bubble-me": "#0369a1",
    "--app-bubble-me-text": "#ffffff",
    "--app-divider": "#071422",
    "--app-input-bg": "#030b14",
  },
  matrix: {
    id: "matrix", name: "Matrix", emoji: "🖥️",
    preview: ["#000000", "#001100", "#00ff41"],
    "--app-bg": "#000000",
    "--app-card": "#001100",
    "--app-nav": "#000000",
    "--app-header": "#000000",
    "--app-border": "#003300",
    "--app-text": "#00ff41",
    "--app-text-sub": "#007a20",
    "--app-text-dim": "#004010",
    "--app-accent": "#00ff41",
    "--app-accent-text": "#000000",
    "--app-balance-bg": "#001a00",
    "--app-balance-text": "#00ff41",
    "--app-balance-sub": "rgba(0,255,65,0.35)",
    "--app-bubble-me": "#004400",
    "--app-bubble-me-text": "#00ff41",
    "--app-divider": "#001a00",
    "--app-input-bg": "#000800",
  },
};

export function applyTheme(id: ThemeId) {
  const theme = THEMES[id] ?? THEMES.classic;
  Object.entries(theme).forEach(([k, v]) => {
    if (k.startsWith("--")) {
      document.documentElement.style.setProperty(k, v as string);
    }
  });
  localStorage.setItem("vbc-theme", id);
}

export function getStoredTheme(): ThemeId {
  return (localStorage.getItem("vbc-theme") as ThemeId | null) ?? "classic";
}
