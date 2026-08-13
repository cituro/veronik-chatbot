// Baza de cunostinte a chatbot-ului: stocheaza bucati de text (chunks) provenite
// din documente incarcate si din pagini de site scanate, si permite cautarea
// celor mai relevante bucati pentru o intrebare, folosind scor TF-IDF.
// Nu necesita niciun API extern de embeddings - functioneaza complet local.

const fs = require("fs");
const path = require("path");
const { chunkText, tokenize } = require("./textUtils");
const DATA_DIR = require("./dataDir");

const DATA_FILE = path.join(DATA_DIR, "knowledge.json");

function loadRaw() {
  if (!fs.existsSync(DATA_FILE)) {
    return { sources: [], chunks: [], settings: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { sources: [], chunks: [], settings: {} };
  }
}

function saveRaw(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

class KnowledgeStore {
  constructor() {
    this.data = loadRaw();
    if (!this.data.settings) this.data.settings = {};
  }

  persist() {
    saveRaw(this.data);
  }

  getSettings() {
    return {
      businessName: this.data.settings.businessName || "",
      businessDescription: this.data.settings.businessDescription || "",
      greeting: this.data.settings.greeting || "",
      tone: this.data.settings.tone || "prietenos si profesionist",
      language: this.data.settings.language || "romana",
      logoUrl: this.data.settings.logoUrl || "",
      // pozitia bulei de chat pe ecran - singura personalizare vizuala lasata
      // la alegerea clientului (culoarea e fixa, brand Veronik, pe toate instantele)
      position: this.data.settings.position === "left" ? "left" : "right",
    };
  }

  updateSettings(patch) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.persist();
    return this.getSettings();
  }

  listSources() {
    return this.data.sources.map((s) => ({
      ...s,
      chunkCount: this.data.chunks.filter((c) => c.sourceId === s.id).length,
    }));
  }

  removeSource(sourceId) {
    this.data.sources = this.data.sources.filter((s) => s.id !== sourceId);
    this.data.chunks = this.data.chunks.filter((c) => c.sourceId !== sourceId);
    this.persist();
  }

  clearAll() {
    this.data.sources = [];
    this.data.chunks = [];
    this.persist();
  }

  addSource({ id, type, label, origin }) {
    // inlocuieste o sursa existenta cu acelasi id (re-scanare/re-upload)
    this.data.sources = this.data.sources.filter((s) => s.id !== id);
    this.data.chunks = this.data.chunks.filter((c) => c.sourceId !== id);
    this.data.sources.push({
      id,
      type, // "document" | "webpage"
      label,
      origin, // nume fisier sau URL
      addedAt: new Date().toISOString(),
    });
  }

  addTextForSource(sourceId, text) {
    const pieces = chunkText(text);
    for (const piece of pieces) {
      this.data.chunks.push({
        id: `${sourceId}#${this.data.chunks.length}`,
        sourceId,
        text: piece,
        tokens: tokenize(piece),
      });
    }
  }

  finalizeIngest() {
    this.persist();
  }

  get chunkCount() {
    return this.data.chunks.length;
  }

  // Cauta cele mai relevante `topK` bucati de text pentru interogarea data,
  // folosind un scor TF-IDF simplu (fara dependinte externe).
  search(query, topK = 5) {
    const chunks = this.data.chunks;
    if (chunks.length === 0) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const N = chunks.length;
    const df = new Map();
    for (const chunk of chunks) {
      const seen = new Set(chunk.tokens);
      for (const tok of seen) {
        df.set(tok, (df.get(tok) || 0) + 1);
      }
    }

    const idf = (tok) => Math.log((N + 1) / ((df.get(tok) || 0) + 1)) + 1;

    const scored = chunks.map((chunk) => {
      const tf = new Map();
      for (const tok of chunk.tokens) tf.set(tok, (tf.get(tok) || 0) + 1);

      let score = 0;
      for (const qTok of queryTokens) {
        if (tf.has(qTok)) {
          score += (tf.get(qTok) / chunk.tokens.length) * idf(qTok);
        }
      }
      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => {
        const source = this.data.sources.find((src) => src.id === s.chunk.sourceId);
        return {
          text: s.chunk.text,
          sourceId: s.chunk.sourceId,
          score: s.score,
          // url e disponibil doar pentru pagini scanate de pe site (nu si pentru
          // documente incarcate, unde "origin" e doar numele fisierului)
          url: source && source.type === "webpage" ? source.origin : null,
        };
      });
  }
}

module.exports = new KnowledgeStore();
