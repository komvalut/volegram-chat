import { useState } from "react";
import { ChevronDown, MessageCircle, Ticket, Zap, Shield, ArrowLeftRight, Coins, Smartphone, Building2, Users } from "lucide-react";

export default function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-neutral-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-base">📖</span>
          <span className="text-sm font-extrabold text-black">How Volegram works</span>
        </div>
        <ChevronDown size={16} className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 space-y-4 text-sm text-neutral-700 border-t border-neutral-50">

          <Step icon={<MessageCircle size={15}/>} title="Sign in — no email, no phone required" accent>
            Use any <strong>Lightning address</strong> (e.g. you@walletofsatoshi.com) — or log in with a one-time code. Zero KYC, zero registration.
          </Step>

          <Step icon={<Zap size={15}/>} title="VBC Balance — your in-app Bitcoin wallet">
            Your balance is in <strong>satoshis (sats)</strong> — the smallest unit of Bitcoin.
            1 sat ≈ 0.0001 cents. Top up via Lightning, bank transfer, or buy from a P2P seller.
            Send sats to anyone on the platform instantly.
          </Step>

          <Step icon={<Ticket size={15}/>} title="Volegram Vouchers (VV) — the utility token">
            Buy a voucher in <strong>EUR/RSD/BAM/CHF/USD</strong> with Lightning or bank transfer.
            Amounts are auto-jittered (e.g. €1.47) so each transaction looks unique.
            Recipients redeem to sats at live BTC rate — then spend on OTP codes, eSIM, P2P market, anything.
            <strong className="text-black block mt-1">VV is the bridge between fiat and Bitcoin inside the app.</strong>
          </Step>

          <Step icon={<ArrowLeftRight size={15}/>} title="P2P MicroSwap — swap any coin, P2P">
            List what you have, list what you want. Counterparties chat, agree on price, settle via Lightning.
            Supports BTC, USDT, ETH, PEPE, DOGE, SHIB and 60+ other tokens.
            No exchange account needed — just two people and trust.
          </Step>

          <Step icon={<Coins size={15}/>} title="P2P Credits — lend &amp; borrow sats">
            <strong>Lenders</strong> post offers: "I'll lend 10,000 sats at 5% for 7 days."
            <strong className="ml-1">Borrowers</strong> take the offer and receive sats instantly.
            Repay principal + interest before the deadline — all on-chain in sats.
            Great way to <strong>earn passive income in Bitcoin</strong> without selling.
          </Step>

          <Step icon={<Smartphone size={15}/>} title="P2P OTP Code — privacy phone numbers">
            Buy a temporary virtual phone number (OTP code) for WhatsApp, Telegram, etc.
            Pay with sats. Numbers are valid for one SMS verification — private, disposable.
            Admin delivers the code to your VBC chat.
          </Step>

          <Step icon={<Building2 size={15}/>} title="No Revolut? Top up via bank transfer">
            Balkans users: send <strong>EUR/RSD/BAM</strong> to the admin's bank (IBAN).
            Include your username in the transfer reference.
            Admin converts to sats at live BTC rate and credits your balance.
            No crypto wallet required — just a normal bank transfer.
          </Step>

          <Step icon={<Users size={15}/>} title="P2P Market — buy sats with cash">
            Find a local seller who accepts <strong>RSD cash, Revolut, or bank transfer</strong>.
            Agree on price in chat, pay them, they send sats to your VBC balance.
            The safest way to get started if you have zero Bitcoin.
          </Step>

          <Step icon={<Shield size={15}/>} title="Privacy &amp; control — zero tracking">
            No email, no phone, no documents. Vouchers carry no identity beyond their code.
            Admin can freeze/void any voucher. You control your keys via Lightning address.
            VBC never holds your private keys.
          </Step>
        </div>
      )}
    </div>
  );
}

function Step({ icon, title, children, accent }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-[#F7931A] text-white" : "bg-neutral-100 text-neutral-700"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-extrabold text-black text-xs mb-0.5">{title}</div>
        <div className="text-[11px] text-neutral-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
