import { Router } from "express";

const router = Router();

function auth(req: any, res: any, next: any) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

const SYSTEM_PROMPT = `You are VBC Assistant — the AI helper for Volegram Bitcoin Chat, a P2P Lightning Network marketplace for the Serbian market. You speak English.

You help users with:
- Bitcoin and Lightning Network basics
- How to buy/sell/trade Bitcoin on VBC
- eSIM data plans (available in the eSIM section)
- Volegram Vouchers (buy, send, redeem)
- Account and wallet questions
- P2P Market and escrow trades

Be concise, friendly, and focused on Bitcoin/VBC topics. If asked about something unrelated, gently redirect to VBC features.`;

router.post("/chat", auth, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      reply: "AI assistant is not yet configured. The admin needs to set the OPENAI_API_KEY environment variable to enable AI chat."
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[AI] OpenAI error:", err);
      return res.status(500).json({ error: "AI service error" });
    }

    const data = await response.json() as any;
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (e: any) {
    console.error("[AI] fetch error:", e.message);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
