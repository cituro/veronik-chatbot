const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const store = require("../lib/store");
const { parseDocument } = require("../lib/docParser");
const { crawlSite } = require("../lib/scraper");
const requireAdmin = require("../lib/requireAdmin");
const leads = require("../lib/leads");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per fisier
});

router.post("/login", requireAdmin, (req, res) => {
  res.json({ ok: true });
});

router.get("/settings", requireAdmin, (req, res) => {
  res.json(store.getSettings());
});

router.post("/settings", requireAdmin, (req, res) => {
  const { businessName, businessDescription, greeting, tone, language, logoUrl } = req.body || {};
  const updated = store.updateSettings({ businessName, businessDescription, greeting, tone, language, logoUrl });
  res.json(updated);
});

router.get("/sources", requireAdmin, (req, res) => {
  res.json({ sources: store.listSources(), totalChunks: store.chunkCount });
});

router.delete("/sources/:id", requireAdmin, (req, res) => {
  store.removeSource(req.params.id);
  res.json({ ok: true });
});

router.get("/leads", requireAdmin, (req, res) => {
  res.json({ leads: leads.listLeads() });
});

router.patch("/leads/:id", requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!status || typeof status !== "string") {
    return res.status(400).json({ error: "Campul 'status' este obligatoriu." });
  }
  const updated = leads.updateStatus(req.params.id, status);
  if (!updated) return res.status(404).json({ error: "Cererea nu a fost gasita." });
  res.json(updated);
});

router.delete("/leads/:id", requireAdmin, (req, res) => {
  leads.removeLead(req.params.id);
  res.json({ ok: true });
});

router.post("/clear", requireAdmin, (req, res) => {
  store.clearAll();
  res.json({ ok: true });
});

router.post("/upload", requireAdmin, upload.array("files", 10), async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ error: "Niciun fisier primit." });
  }

  const results = [];
  for (const file of files) {
    try {
      const text = await parseDocument(file.path, file.originalname);
      const sourceId = `doc:${crypto.createHash("sha1").update(file.originalname).digest("hex")}`;
      store.addSource({ id: sourceId, type: "document", label: file.originalname, origin: file.originalname });
      store.addTextForSource(sourceId, text);
      results.push({ file: file.originalname, ok: true });
    } catch (err) {
      results.push({ file: file.originalname, ok: false, error: err.message });
    } finally {
      fs.unlink(file.path, () => {});
    }
  }
  store.finalizeIngest();

  res.json({ results, totalChunks: store.chunkCount });
});

router.post("/scan-site", requireAdmin, async (req, res) => {
  const { url, maxPages, maxDepth } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Campul 'url' este obligatoriu." });
  }

  try {
    const pages = await crawlSite(url, {
      maxPages: Math.min(Number(maxPages) || 15, 50),
      maxDepth: Math.min(Number(maxDepth) || 2, 3),
      onPage: (page) => {
        const sourceId = `web:${crypto.createHash("sha1").update(page.url).digest("hex")}`;
        store.addSource({ id: sourceId, type: "webpage", label: page.title || page.url, origin: page.url });
        store.addTextForSource(sourceId, `${page.title || ""}\n\n${page.text}`);
      },
    });
    store.finalizeIngest();

    res.json({ pagesScanned: pages.length, urls: pages.map((p) => p.url), totalChunks: store.chunkCount });
  } catch (err) {
    console.error("Eroare scanare site:", err);
    res.status(500).json({ error: `Nu am putut scana site-ul: ${err.message}` });
  }
});

module.exports = router;
