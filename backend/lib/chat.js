// Logica de conversatie: construieste promptul de sistem folosind setarile
// afacerii + bucatile relevante din baza de cunostinte (RAG), pastreaza
// istoricul conversatiei per sesiune de vizitator si apeleaza Claude.

const Anthropic = require("@anthropic-ai/sdk");
const store = require("./store");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const MAX_TURNS_KEPT = 12; // ultimele N mesaje (user+assistant) pastrate per sesiune
const MAX_SESSIONS = 5000; // limita simpla ca sa nu creasca memoria la nesfarsit
const TOP_K_CHUNKS = 6;

const sessions = new Map(); // sessionId -> [{role, content}]

function getHistory(sessionId) {
  return sessions.get(sessionId) || [];
}

function saveTurn(sessionId, userText, assistantText) {
  if (!sessions.has(sessionId)) {
    if (sessions.size >= MAX_SESSIONS) {
      const oldestKey = sessions.keys().next().value;
      sessions.delete(oldestKey);
    }
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);
  history.push({ role: "user", content: userText });
  history.push({ role: "assistant", content: assistantText });
  while (history.length > MAX_TURNS_KEPT * 2) history.shift();
}

function buildSystemPrompt(relevantChunks) {
  const settings = store.getSettings();
  const businessName = settings.businessName || "acest site";
  const businessDescription = settings.businessDescription
    ? `\nDescrierea afacerii (furnizata de proprietar):\n${settings.businessDescription}\n`
    : "";

  const context = relevantChunks.length
    ? relevantChunks.map((c, i) => `[Fragment ${i + 1}]\n${c.text}`).join("\n\n")
    : "(Nu s-a gasit niciun fragment relevant in baza de cunostinte pentru aceasta intrebare.)";

  return `Esti asistentul virtual al "${businessName}". Vorbesti cu vizitatori ai site-ului si raspunzi la intrebari despre serviciile si produsele oferite.
Tonul tau este: ${settings.tone}. Raspunde in limba: ${settings.language}, cu exceptia cazului in care vizitatorul scrie in alta limba - atunci raspunde in limba lui.
${businessDescription}
Reguli importante:
- Foloseste EXCLUSIV informatiile din contextul de mai jos (extras din documentatia si site-ul afacerii) pentru a raspunde despre servicii, produse, preturi, program etc.
- Daca informatia nu se regaseste in context, spune sincer ca nu ai aceasta informatie si recomanda vizitatorului sa contacteze direct afacerea, in loc sa inventezi detalii.
- Fii concis, prietenos si concret. Ofera pasi urmatori clari (ex: cum poate contacta afacerea, ce informatii sa pregateasca).
- Nu inventa preturi, adrese, numere de telefon sau alte date care nu apar in context.

Context relevant din baza de cunostinte:
${context}`;
}

async function reply(sessionId, userText) {
  const relevantChunks = store.search(userText, TOP_K_CHUNKS);
  const system = buildSystemPrompt(relevantChunks);
  const history = getHistory(sessionId);

  const messages = [...history, { role: "user", content: userText }];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages,
  });

  const assistantText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  saveTurn(sessionId, userText, assistantText);

  return assistantText;
}

module.exports = { reply, getHistory };
