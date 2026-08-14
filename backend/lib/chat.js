// Logica de conversatie: construieste promptul de sistem folosind setarile
// afacerii + bucatile relevante din baza de cunostinte (RAG) si apeleaza Claude.
//
// Istoricul conversatiei NU mai e tinut in memoria serverului - vine de la
// client (widget.js), care il pastreaza in localStorage. Asta face serverul
// stateless (rezista la restart/redeploy fara sa piarda contextul unei
// conversatii in desfasurare) si rezolva si problema vizuala (vizitatorul isi
// vede mesajele anterioare si dupa un refresh de pagina).

const Anthropic = require("@anthropic-ai/sdk");
const store = require("./store");
const usage = require("./usage");
const conversations = require("./conversations");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const MAX_TURNS_KEPT = 12; // ultimele N schimburi (user+assistant) trimise ca context
const TOP_K_CHUNKS = 6;

function buildSystemPrompt(relevantChunks) {
  const settings = store.getSettings();
  const businessName = settings.businessName || "acest site";
  const businessDescription = settings.businessDescription
    ? `\nDescrierea afacerii (furnizata de proprietar):\n${settings.businessDescription}\n`
    : "";

  const context = relevantChunks.length
    ? relevantChunks
        .map((c, i) => `[Fragment ${i + 1}${c.url ? ` - pagina: ${c.url}` : ""}]\n${c.text}`)
        .join("\n\n")
    : "(Nu s-a gasit niciun fragment relevant in baza de cunostinte pentru aceasta intrebare.)";

  return `Esti asistentul virtual al "${businessName}". Vorbesti cu vizitatori ai site-ului si raspunzi la intrebari despre serviciile si produsele oferite.
Tonul tau este: ${settings.tone}. Raspunde in limba: ${settings.language}, cu exceptia cazului in care vizitatorul scrie in alta limba - atunci raspunde in limba lui.
${businessDescription}
Reguli importante:
- Foloseste EXCLUSIV informatiile din contextul de mai jos (extras din documentatia si site-ul afacerii) pentru a raspunde despre servicii, produse, preturi, program etc.
- Daca informatia nu se regaseste in context, spune sincer ca nu ai aceasta informatie si recomanda vizitatorului sa contacteze direct afacerea, in loc sa inventezi detalii.
- Fii concis, prietenos si concret. Ofera pasi urmatori clari (ex: cum poate contacta afacerea, ce informatii sa pregateasca).
- Nu inventa preturi, adrese, numere de telefon sau alte date care nu apar in context.
- Daca recomanzi un produs, serviciu sau pagina specifica, iar fragmentul din care ai luat informatia are o "pagina" (URL) asociata, include-l ca link in format markdown: [nume produs/pagina](URL). Nu inventa niciodata un URL care nu apare explicit in context, si nu pui link daca fragmentul nu are unul.

Context relevant din baza de cunostinte:
${context}`;
}

// Curata si limiteaza istoricul primit de la client, ca sa nu poata fi folosit
// pentru a umfla artificial costul unei cereri (fiecare mesaj de istoric conteaza
// ca tokeni de intrare la fiecare apel Anthropic).
function sanitizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  const cleaned = rawHistory
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return cleaned.slice(-MAX_TURNS_KEPT * 2);
}

// Eticheta butonului din cardul de recomandare, ghicita din structura URL-ului
// paginii (nu avem o clasificare explicita produs/serviciu per sursa).
function guessCtaLabel(url) {
  const lower = url.toLowerCase();
  if (/\/(produs|produse|product|products|shop|magazin)(\/|$|\?)/.test(lower)) return "Vezi produsul";
  if (/\/(serviciu|servicii|service|services)(\/|$|\?)/.test(lower)) return "Vezi serviciul";
  return "Vezi detalii";
}

// Extrage linkurile [text](url) din raspunsul lui Claude si, pentru cele care
// corespund unei pagini scanate cu imagine reprezentativa cunoscuta, construieste
// datele necesare pentru cardul de produs/serviciu afisat in widget sub mesaj.
function extractLinkCards(assistantText) {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const seen = new Set();
  const links = [];
  let match;
  while ((match = linkRegex.exec(assistantText))) {
    const [, label, url] = match;
    if (seen.has(url)) continue;
    seen.add(url);
    const source = store.getSourceByUrl(url);
    if (source && source.image) {
      links.push({ url, label, title: source.label || label, image: source.image, ctaLabel: guessCtaLabel(url) });
    }
  }
  return links;
}

async function reply(userText, rawHistory, sessionId) {
  const relevantChunks = store.search(userText, TOP_K_CHUNKS);
  const system = buildSystemPrompt(relevantChunks);
  const history = sanitizeHistory(rawHistory);

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

  if (response.usage) {
    usage.recordUsage({
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }

  conversations.logExchange({ sessionId, userText, assistantText });

  return { text: assistantText, links: extractLinkCards(assistantText) };
}

module.exports = { reply };
