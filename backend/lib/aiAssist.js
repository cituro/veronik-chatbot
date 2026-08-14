// Ajuta clientul sa completeze rapid "Descrierea afacerii" din admin: ia
// niste notite libere/dezordonate scrise de proprietar si le transforma,
// cu Claude, intr-un text structurat pe care il foloseste apoi RAG-ul
// (buildSystemPrompt din chat.js) ca "memorie" despre afacere.
const Anthropic = require("@anthropic-ai/sdk");
const usage = require("./usage");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

const SYSTEM_PROMPT = `Esti un asistent care ajuta proprietarii de afaceri sa scrie o descriere clara si structurata a afacerii lor, folosita ca "memorie" pentru un chatbot AI care raspunde vizitatorilor unui site.
Primesti niste notite brute (posibil neordonate, cu greseli, fraze scurte) de la proprietar si trebuie sa le transformi intr-un text organizat, in limba romana, care sa acopere: ce vinde/ce servicii ofera afacerea, program de lucru (daca e mentionat), livrare/zona deservita (daca e cazul), politici relevante (retur, garantie) daca sunt mentionate, si orice alt detaliu util mentionat.
Reguli:
- Foloseste EXCLUSIV informatiile din notite. Nu inventa preturi, adrese, telefoane sau politici care nu sunt mentionate explicit.
- Scrie clar, la persoana a treia, in propozitii si paragrafe scurte (fara markdown, fara titluri, fara liste cu bullet-uri).
- Daca notitele sunt foarte sarace, scrie un text scurt cu ce exista si atat - nu umple golurile cu presupuneri.`;

async function generateBusinessDescription({ businessName, notes }) {
  const userMsg = `Numele afacerii: ${businessName || "(nespecificat)"}\n\nNotite de la proprietar:\n${notes}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = response.content
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

  return text;
}

module.exports = { generateBusinessDescription };
