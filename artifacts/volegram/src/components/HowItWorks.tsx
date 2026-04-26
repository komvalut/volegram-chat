import { useState } from "react";
import { ChevronDown, MessageCircle, Ticket, Zap, Shield, ArrowLeftRight } from "lucide-react";

export default function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface-card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors">
        <span className="text-sm font-bold text-neutral-900">How Volegram works</span>
        <ChevronDown size={16} className={`text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 text-sm text-neutral-700 animate-slide-up">
          <Step icon={<MessageCircle size={16}/>} title="1. Sign in with Lightning Address (or OTP code)">
            Use any Lightning address (e.g. you@walletofsatoshi.com) — no email or phone required.
            Returning users can also log in with a one-time code sent to their saved email.
          </Step>
          <Step icon={<Zap size={16}/>} title="2. P2P Marketplace — buy/sell crypto">
            List any asset (BTC, USDT, LTC, ETH) at any price. Counterparties chat directly,
            agree on terms, and settle via Lightning. The platform takes a small commission set by the admin.
          </Step>
          <Step icon={<Ticket size={16}/>} title="3. Volegram Vouchers (VV) — gift any amount">
            Buy a voucher in <strong>Sats / EUR / USD / GBP / BAM / RSD / HRK / CHF</strong>.
            Pay via Lightning (instant) or bank transfer (IBAN — admin confirms).
            All amounts are auto-jittered to non-round values (e.g. €1.45, ⚡1.047) so each
            transaction looks unique. Send vouchers as gifts; recipients redeem to their sats balance.
          </Step>
          <Step icon={<ArrowLeftRight size={16}/>} title="4. Redeem on the same P2P market">
            Vouchers convert to sats on redemption (live BTC rate from CoinGecko).
            Recipients can immediately spend them on the marketplace — no external exchange needed.
          </Step>
          <Step icon={<Shield size={16}/>} title="5. Privacy & control">
            Zero KYC. Vouchers carry no identity beyond their code. Admin can freeze, void,
            or refund any voucher; commission rate is adjustable anytime.
          </Step>
        </div>
      )}
    </div>
  );
}

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center shrink-0 accent">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-bold text-neutral-900 mb-0.5">{title}</div>
        <div className="text-xs text-neutral-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
