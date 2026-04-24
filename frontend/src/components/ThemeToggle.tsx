import { useTheme } from "../lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "btc" ? "Switch to Mono" : "Switch to BTC"}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        background: theme === "btc"
          ? "linear-gradient(135deg, #F7931A, #c97415)"
          : "linear-gradient(135deg, #ffffff, #aaaaaa)",
        boxShadow: theme === "btc"
          ? "0 0 24px rgba(247,147,26,0.5), 0 4px 16px rgba(0,0,0,0.4)"
          : "0 0 24px rgba(255,255,255,0.3), 0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span className="text-xl select-none">
        {theme === "btc" ? "₿" : "◐"}
      </span>
    </button>
  );
}
