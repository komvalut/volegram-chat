import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";

export default function InstallPWA() {
  const [prompt, setPrompt]       = useState<any>(null);
  const [show, setShow]           = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed / running as PWA
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setInstalled(true); return;
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3s if not installed
      const seen = sessionStorage.getItem("vbc-ios-prompt");
      if (!seen) { setTimeout(() => setShow(true), 3000); }
      return;
    }

    // Android / Desktop — beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      const dismissed = localStorage.getItem("vbc-pwa-dismissed");
      if (!dismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShow(false);
    setPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("vbc-pwa-dismissed", "1");
    if (isIOS) sessionStorage.setItem("vbc-ios-prompt", "1");
  };

  if (!show || installed) return null;

  return (
    <div id="pwa-install-banner" className="animate-slide-up">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 bg-[#F7931A] flex items-center justify-center text-black text-lg font-black shrink-0">
          ⚡
        </div>
        <div>
          <p className="text-[11px] font-black text-[#F7931A] uppercase tracking-widest leading-none">
            Install VBC
          </p>
          <p className="text-[9px] text-neutral-500 mt-0.5">
            {isIOS ? "Tap Share → Add to Home Screen" : "Add to home screen for instant access"}
          </p>
        </div>
      </div>

      {isIOS ? (
        <div className="flex-1 flex items-center gap-1.5 text-[9px] text-neutral-600">
          <Smartphone size={11} className="text-[#F7931A] shrink-0"/>
          <span>Safari: tap <strong className="text-white">⬆</strong> then <strong className="text-white">Add to Home Screen</strong></span>
        </div>
      ) : (
        <button onClick={install}
          className="ml-auto shrink-0 flex items-center gap-1.5 bg-[#F7931A] text-black text-[10px] font-black px-3 py-2 uppercase tracking-wider hover:bg-[#e8841a] transition-colors">
          <Download size={11}/> Install
        </button>
      )}

      <button onClick={dismiss}
        className="shrink-0 text-neutral-700 hover:text-white p-1 ml-1">
        <X size={14}/>
      </button>
    </div>
  );
}
