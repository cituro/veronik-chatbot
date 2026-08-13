// Contorizeaza consumul real de tokeni Anthropic per instanta, ca sa poti
// vedea cat costa efectiv fiecare client (nu doar o estimare).
const fs = require("fs");
const path = require("path");
const DATA_DIR = require("./dataDir");

const USAGE_FILE = path.join(DATA_DIR, "usage.json");

// Pret Claude Sonnet 4.5, per milion de tokeni (verifica/actualizeaza daca
// schimbi modelul din ANTHROPIC_MODEL sau daca Anthropic isi schimba preturile).
const PRICE_PER_M_INPUT = 3;
const PRICE_PER_M_OUTPUT = 15;

function load() {
  if (!fs.existsSync(USAGE_FILE)) {
    return { events: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
  } catch {
    return { events: [] };
  }
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function recordUsage({ inputTokens, outputTokens }) {
  const data = load();
  data.events.push({
    at: new Date().toISOString(),
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
  });
  // pastram cel mult ultimele 20000 de evenimente, ca fisierul sa nu creasca la nesfarsit
  if (data.events.length > 20000) {
    data.events = data.events.slice(data.events.length - 20000);
  }
  save(data);
}

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens / 1_000_000) * PRICE_PER_M_INPUT + (outputTokens / 1_000_000) * PRICE_PER_M_OUTPUT;
}

function getStats() {
  const data = load();
  const now = Date.now();
  const day30 = now - 30 * 24 * 60 * 60 * 1000;

  const totals = { messages: 0, inputTokens: 0, outputTokens: 0 };
  const last30 = { messages: 0, inputTokens: 0, outputTokens: 0 };

  for (const ev of data.events) {
    totals.messages += 1;
    totals.inputTokens += ev.inputTokens;
    totals.outputTokens += ev.outputTokens;
    if (new Date(ev.at).getTime() >= day30) {
      last30.messages += 1;
      last30.inputTokens += ev.inputTokens;
      last30.outputTokens += ev.outputTokens;
    }
  }

  return {
    total: { ...totals, estimatedCostUsd: estimateCost(totals.inputTokens, totals.outputTokens) },
    last30Days: { ...last30, estimatedCostUsd: estimateCost(last30.inputTokens, last30.outputTokens) },
  };
}

module.exports = { recordUsage, getStats };
