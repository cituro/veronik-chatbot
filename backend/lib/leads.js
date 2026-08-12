// Stocare simpla pentru cererile de trial/abonament trimise din landing page.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

function loadAll() {
  if (!fs.existsSync(LEADS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveAll(leads) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

function addLead({ name, email, siteUrl, plan, message, gdprConsentAt }) {
  const leads = loadAll();
  const lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name,
    email,
    siteUrl: siteUrl || "",
    plan,
    message: message || "",
    status: "nou",
    createdAt: new Date().toISOString(),
    gdprConsentAt: gdprConsentAt || new Date().toISOString(),
  };
  leads.unshift(lead);
  saveAll(leads);
  return lead;
}

function listLeads() {
  return loadAll();
}

function updateStatus(id, status) {
  const leads = loadAll();
  const lead = leads.find((l) => l.id === id);
  if (lead) {
    lead.status = status;
    saveAll(leads);
  }
  return lead;
}

function removeLead(id) {
  const leads = loadAll().filter((l) => l.id !== id);
  saveAll(leads);
}

module.exports = { addLead, listLeads, updateStatus, removeLead };
