const express = require("express");
const { v4: uuidv4 } = require("uuid");
const chat = require("../lib/chat");
const leads = require("../lib/leads");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PLANS = new Set(["trial", "start", "business"]);

router.post("/leads", (req, res) => {
  const { name, email, siteUrl, plan, message, gdprConsent } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim() || name.length > 120) {
    return res.status(400).json({ error: "Numele este obligatoriu (max 120 caractere)." });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 200) {
    return res.status(400).json({ error: "Adresa de email nu este valida." });
  }
  if (siteUrl && (typeof siteUrl !== "string" || siteUrl.length > 300)) {
    return res.status(400).json({ error: "URL-ul site-ului este prea lung." });
  }
  if (plan && (typeof plan !== "string" || !VALID_PLANS.has(plan.toLowerCase()))) {
    return res.status(400).json({ error: "Plan invalid." });
  }
  if (message && (typeof message !== "string" || message.length > 1000)) {
    return res.status(400).json({ error: "Mesajul este prea lung (max 1000 caractere)." });
  }
  if (gdprConsent !== true) {
    return res.status(400).json({ error: "Este necesar acordul privind politica de confidentialitate." });
  }

  const lead = leads.addLead({
    name: name.trim(),
    email: email.trim(),
    siteUrl: siteUrl ? siteUrl.trim() : "",
    plan: plan ? plan.toLowerCase() : "trial",
    message: message ? message.trim() : "",
    gdprConsentAt: new Date().toISOString(),
  });

  res.json({ ok: true, id: lead.id });
});

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Campul 'message' este obligatoriu." });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: "Mesajul este prea lung (max 4000 caractere)." });
    }

    const sid = sessionId && typeof sessionId === "string" ? sessionId : uuidv4();
    const answer = await chat.reply(sid, message.trim());

    res.json({ sessionId: sid, reply: answer });
  } catch (err) {
    console.error("Eroare /api/chat:", err);
    res.status(500).json({ error: "A aparut o eroare la generarea raspunsului. Incearca din nou." });
  }
});

module.exports = router;
