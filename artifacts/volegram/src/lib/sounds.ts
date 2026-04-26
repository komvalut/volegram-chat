export type SoundKey = "none" | "classic" | "bitcoin" | "soft" | "ping" | "triple";

export const SOUND_OPTIONS: { key: SoundKey; label: string; emoji: string }[] = [
  { key: "none",    label: "Bez zvuka",     emoji: "🔇" },
  { key: "classic", label: "Classic SMS",   emoji: "📱" },
  { key: "bitcoin", label: "Bitcoin Ding",  emoji: "⚡" },
  { key: "soft",    label: "Soft Pop",      emoji: "🫧" },
  { key: "ping",    label: "Crystal Ping",  emoji: "🔔" },
  { key: "triple",  label: "Triple Beep",   emoji: "🔊" },
];

function ac() {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function tone(freq: number, dur: number, gain = 0.25, type: OscillatorType = "sine", delay = 0) {
  const ctx = ac();
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0, ctx.currentTime + delay);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur + 0.01);
}

const PLAYERS: Record<SoundKey, () => void> = {
  none:    () => {},
  classic: () => {
    tone(880, 0.12, 0.3, "square");
    tone(1100, 0.12, 0.3, "square", 0.15);
  },
  bitcoin: () => {
    tone(440, 0.1, 0.2, "sine");
    tone(880, 0.2, 0.3, "sine", 0.12);
    tone(1320, 0.25, 0.2, "sine", 0.30);
  },
  soft:    () => {
    tone(528, 0.35, 0.18, "sine");
  },
  ping:    () => {
    tone(2093, 0.4, 0.22, "sine");
  },
  triple:  () => {
    tone(900, 0.08, 0.3, "square");
    tone(900, 0.08, 0.3, "square", 0.15);
    tone(900, 0.08, 0.3, "square", 0.30);
  },
};

export function playSound(key?: SoundKey) {
  try {
    const k = key ?? getNotifSound();
    PLAYERS[k]?.();
  } catch {}
}

export function previewSound(key: SoundKey) {
  try { PLAYERS[key]?.(); } catch {}
}

export function getNotifSound(): SoundKey {
  return (localStorage.getItem("vbc_notif_sound") as SoundKey) ?? "classic";
}
export function setNotifSound(key: SoundKey) {
  localStorage.setItem("vbc_notif_sound", key);
}
