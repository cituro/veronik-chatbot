require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const chatRoutes = require("./routes/chat");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api", chatRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    leadsEnabled: process.env.ENABLE_LEADS === "true",
  });
});

app.listen(PORT, () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ATENTIE: ANTHROPIC_API_KEY nu este setata in .env - chatul nu va functiona pana nu o adaugi.");
  }
  console.log(`Server chatbot pornit pe http://localhost:${PORT}`);
  console.log(`Panou admin: http://localhost:${PORT}/admin.html`);
  console.log(`Pagina demo: http://localhost:${PORT}/demo.html`);
});
