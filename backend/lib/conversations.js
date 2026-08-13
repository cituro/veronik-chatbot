// Istoric de conversatii: pastreaza schimburile intrebare/raspuns ca sa poata
// fi revizuite din panoul de admin (util pentru a vedea ce intreaba vizitatorii
// si unde botul nu a putut raspunde). Vizibil clientului, nu doar Veronik -
// sunt interactiunile propriilor lui vizitatori.
const fs = require("fs");
const path = require("path");
const DATA_DIR = require("./dataDir");

const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const MAX_STORED = 5000; // limiteaza cresterea fisierului pe termen lung

function load() {
  if (!fs.existsSync(CONVERSATIONS_FILE)) return { events: [] };
  try {
    return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, "utf-8"));
  } catch {
    return { events: [] };
  }
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function logExchange({ sessionId, userText, assistantText }) {
  const data = load();
  data.events.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    sessionId: sessionId || "",
    at: new Date().toISOString(),
    userText: (userText || "").slice(0, 4000),
    assistantText: (assistantText || "").slice(0, 4000),
  });
  if (data.events.length > MAX_STORED) {
    data.events = data.events.slice(data.events.length - MAX_STORED);
  }
  save(data);
}

function listConversations({ limit = 50, offset = 0 } = {}) {
  const data = load();
  const sorted = [...data.events].reverse(); // cele mai recente primele
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  return {
    total: sorted.length,
    conversations: sorted.slice(safeOffset, safeOffset + safeLimit),
  };
}

function clearAll() {
  save({ events: [] });
}

module.exports = { logExchange, listConversations, clearAll };
