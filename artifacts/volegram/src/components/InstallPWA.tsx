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
        <div className="w-9 h-9 bg-black flex items-center justify-center text-white text-lg font-extrabold shrink-0">
          ⚡
        </div>
        <div>
          <p className="text-sm font-extrabold text-black uppercase tracking-wide leading-none">
            Install VBC
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isIOS ? "Tap Share → Add to Home Screen" : "Add to home screen for instant access"}
          </p>
        </div>
      </div>

      {isIOS ? (
        <div className="flex-1 flex items-center gap-1.5 text-xs text-neutral-600">
          <Smartphone size={11} className="text-black shrink-0"/>
          <span>Safari: tap <strong className="text-black">⬆</strong> then <strong className="text-black">Add to Home Screen</strong></span>
        </div>
      ) : (
        <button onClick={install}
          className="ml-auto shrink-0 flex items-center gap-1.5 bg-black text-white text-xs font-extrabold px-3 py-2 uppercase tracking-wider hover:bg-neutral-800 transition-colors">
          <Download size={11}/> Install
        </button>
      )}

      <button onClick={dismiss}
        className="shrink-0 text-neutral-500 hover:text-black p-1 ml-1">
        <X size={14}/>
      </button>
    </div>
  );
}
