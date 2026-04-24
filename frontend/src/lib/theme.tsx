import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "btc" | "mono";

interface ThemeCtx { theme: Theme; toggle: () => void; }
const Ctx = createContext<ThemeCtx>({ theme: "btc", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("vbc-theme") as Theme) ?? "btc";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vbc-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === "btc" ? "mono" : "btc");

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
